/**
 * Food Safety Dashboard
 * لوحة تحكم سلامة الغذاء - HACCP
 */

import React, { useState } from 'react';
import {
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    ClipboardDocumentCheckIcon,
    BeakerIcon,
    PlusIcon,
    ChartBarIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { useFoodSafety } from '../../hooks/useFoodSafety';
import { LabDashboardSkeleton } from '../../components/common/LoadingStates';
import type { ControlPoint, ControlPointType, HazardType, CriticalLimit } from '../../types/foodSafety';

const FoodSafetyDashboard: React.FC = () => {
    const { controlPoints, stats, pendingActions, isLoading, addControlPoint } = useFoodSafety();
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedType, setSelectedType] = useState<ControlPointType | 'all'>('all');

    const filteredPoints = selectedType === 'all'
        ? controlPoints
        : controlPoints.filter(cp => cp.type === selectedType);

    const getTypeColor = (type: ControlPointType) => {
        switch (type) {
            case 'CCP': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'OPRP': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'PRP': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    const getHazardIcon = (type: HazardType) => {
        switch (type) {
            case 'biological': return '🦠';
            case 'chemical': return '⚗️';
            case 'physical': return '🔩';
            case 'allergen': return '⚠️';
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
                        <ShieldCheckIcon className="w-8 h-8 text-green-600" />
                        سلامة الغذاء - HACCP
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        إدارة نقاط التحكم الحرجة ومراقبة سلامة الغذاء
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    إضافة نقطة تحكم
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">نقاط CCP النشطة</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.activeCCPs || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <ClipboardDocumentCheckIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">سجلات المراقبة اليوم</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.todayMonitoringRecords || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <ClockIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">إجراءات تصحيحية معلقة</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.pendingCorrectiveActions || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <ChartBarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">نسبة الامتثال</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.complianceRate || 100}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {[
                    { value: 'all', label: 'الكل' },
                    { value: 'CCP', label: 'CCP - نقاط حرجة' },
                    { value: 'OPRP', label: 'OPRP - برامج تشغيلية' },
                    { value: 'PRP', label: 'PRP - برامج أساسية' }
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setSelectedType(tab.value as ControlPointType | 'all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedType === tab.value
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Control Points List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredPoints.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <BeakerIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            لا توجد نقاط تحكم
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            ابدأ بإضافة نقاط التحكم الحرجة لخطة HACCP
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            إضافة نقطة تحكم
                        </button>
                    </div>
                ) : (
                    filteredPoints.map(point => (
                        <div
                            key={point.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{getHazardIcon(point.hazardType)}</span>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{point.name}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{point.location}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(point.type)}`}>
                                    {point.type}
                                </span>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {point.hazardDescription}
                            </p>

                            {/* Critical Limits */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">الحدود الحرجة:</p>
                                <div className="flex flex-wrap gap-2">
                                    {(point.criticalLimits || []).map((limit, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300 border"
                                        >
                                            {limit.parameter}: {limit.minValue ?? '-'} - {limit.maxValue ?? '-'} {limit.unit}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {point.isActive ? (
                                        <span className="flex items-center gap-1 text-green-600 text-sm">
                                            <CheckCircleIcon className="w-4 h-4" />
                                            نشط
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                                            <XCircleIcon className="w-4 h-4" />
                                            غير نشط
                                        </span>
                                    )}
                                </div>
                                <button className="text-sm text-primary-600 hover:text-primary-700">
                                    تسجيل قراءة
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pending Corrective Actions */}
            {pendingActions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                        الإجراءات التصحيحية المعلقة
                    </h2>
                    <div className="space-y-3">
                        {pendingActions.map(action => (
                            <div
                                key={action.id}
                                className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                            >
                                <div>
                                    {/* <p className="font-medium text-gray-900 dark:text-white">{action.deviationType}</p> */}
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${action.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {action.status === 'open' ? 'مفتوح' : 'قيد التنفيذ'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Control Point Modal */}
            {showAddModal && (
                <AddControlPointModal
                    onClose={() => setShowAddModal(false)}
                    onSave={addControlPoint}
                />
            )}
        </div>
    );
};

// Add Control Point Modal Component
interface AddControlPointModalProps {
    onClose: () => void;
    onSave: (data: Omit<ControlPoint, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const AddControlPointModal: React.FC<AddControlPointModalProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'CCP' as ControlPointType,
        location: '',
        hazardType: 'biological' as HazardType,
        hazardDescription: '',
        monitoringProcedure: '',
        frequency: 'hourly' as string, // Changed from monitoringFrequency to match type
        correctiveAction: '',
        verificationProcedure: '',
        responsiblePerson: '',
        criticalLimits: [{ parameter: '', unit: '', minValue: undefined, maxValue: undefined }] as CriticalLimit[]
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                ...formData,
                isActive: true,
                criticalLimits: formData.criticalLimits.filter(l => l.parameter)
            });
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        إضافة نقطة تحكم جديدة
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">الاسم *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                placeholder="مثال: فحص درجة حرارة الطهي"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">النوع *</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as ControlPointType })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="CCP">CCP - نقطة تحكم حرجة</option>
                                <option value="OPRP">OPRP - برنامج تشغيلي</option>
                                <option value="PRP">PRP - برنامج أساسي</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">الموقع</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                placeholder="مثال: خط الإنتاج 1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">نوع الخطر</label>
                            <select
                                value={formData.hazardType}
                                onChange={e => setFormData({ ...formData, hazardType: e.target.value as HazardType })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="biological">🦠 بيولوجي</option>
                                <option value="chemical">⚗️ كيميائي</option>
                                <option value="physical">🔩 فيزيائي</option>
                                <option value="allergen">⚠️ مسببات الحساسية</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">وصف الخطر</label>
                        <textarea
                            value={formData.hazardDescription}
                            onChange={e => setFormData({ ...formData, hazardDescription: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            rows={2}
                            placeholder="صف الخطر المحتمل..."
                        />
                    </div>

                    {/* Critical Limits */}
                    <div>
                        <label className="block text-sm font-medium mb-2">الحدود الحرجة</label>
                        {formData.criticalLimits.map((limit, idx) => (
                            <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                                <input
                                    type="text"
                                    value={limit.parameter}
                                    onChange={e => {
                                        const updated = [...formData.criticalLimits];
                                        updated[idx].parameter = e.target.value;
                                        setFormData({ ...formData, criticalLimits: updated });
                                    }}
                                    className="px-2 py-1 border rounded dark:bg-gray-700"
                                    placeholder="المعلمة"
                                />
                                <input
                                    type="number"
                                    value={limit.minValue ?? ''}
                                    onChange={e => {
                                        const updated = [...formData.criticalLimits];
                                        updated[idx].minValue = e.target.value ? parseFloat(e.target.value) : undefined;
                                        setFormData({ ...formData, criticalLimits: updated });
                                    }}
                                    className="px-2 py-1 border rounded dark:bg-gray-700"
                                    placeholder="الحد الأدنى"
                                />
                                <input
                                    type="number"
                                    value={limit.maxValue ?? ''}
                                    onChange={e => {
                                        const updated = [...formData.criticalLimits];
                                        updated[idx].maxValue = e.target.value ? parseFloat(e.target.value) : undefined;
                                        setFormData({ ...formData, criticalLimits: updated });
                                    }}
                                    className="px-2 py-1 border rounded dark:bg-gray-700"
                                    placeholder="الحد الأقصى"
                                />
                                <input
                                    type="text"
                                    value={limit.unit}
                                    onChange={e => {
                                        const updated = [...formData.criticalLimits];
                                        updated[idx].unit = e.target.value;
                                        setFormData({ ...formData, criticalLimits: updated });
                                    }}
                                    className="px-2 py-1 border rounded dark:bg-gray-700"
                                    placeholder="الوحدة"
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setFormData({
                                ...formData,
                                criticalLimits: [...formData.criticalLimits, { parameter: '', unit: '', minValue: undefined, maxValue: undefined }]
                            })}
                            className="text-sm text-primary-600 hover:text-primary-700"
                        >
                            + إضافة حد
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">إجراء المراقبة</label>
                        <textarea
                            value={formData.monitoringProcedure}
                            onChange={e => setFormData({ ...formData, monitoringProcedure: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            rows={2}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">الإجراء التصحيحي (عند الانحراف)</label>
                        <textarea
                            value={formData.correctiveAction}
                            onChange={e => setFormData({ ...formData, correctiveAction: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            rows={2}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FoodSafetyDashboard;
