/**
 * Temperature Monitoring Page
 * صفحة مراقبة درجات الحرارة
 */

import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { temperatureService } from '../../services/foodSafety/foodSafetyService';
import type { TemperatureEquipment, TemperatureReading, EquipmentType } from '../../types/foodSafety';
import { PageSkeleton } from '../../components/common/LoadingStates';

// Custom Thermometer Icon component since it might not exist in heroicons
const ThermometerSvg = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19a3 3 0 106 0V9a3 3 0 10-6 0v10zm3-13V3m0 0a1 1 0 00-1 1v2m1-3a1 1 0 011 1v2" />
    </svg>
);

const TemperatureMonitoring: React.FC = () => {
    const [equipment, setEquipment] = useState<TemperatureEquipment[]>([]);
    const [readings, setReadings] = useState<Record<string, TemperatureReading[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [showAddEquipment, setShowAddEquipment] = useState(false);
    const [showRecordModal, setShowRecordModal] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const equipmentData = await temperatureService.getEquipment();
            setEquipment(equipmentData);

            // Load readings for each equipment
            const readingsData: Record<string, TemperatureReading[]> = {};
            for (const eq of equipmentData) {
                readingsData[eq.id] = await temperatureService.getReadings(eq.id, 1);
            }
            setReadings(readingsData);
        } catch (err) {
            console.error('Error loading temperature data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getEquipmentIcon = (type: EquipmentType) => {
        switch (type) {
            case 'refrigerator': return '🧊';
            case 'freezer': return '❄️';
            case 'cold_room': return '🏠';
            case 'hot_holding': return '🔥';
            case 'cooking': return '🍳';
            case 'transport': return '🚚';
            default: return '🌡️';
        }
    };

    const getEquipmentTypeName = (type: EquipmentType) => {
        switch (type) {
            case 'refrigerator': return 'ثلاجة';
            case 'freezer': return 'فريزر';
            case 'cold_room': return 'غرفة تبريد';
            case 'hot_holding': return 'حفظ ساخن';
            case 'cooking': return 'طهي';
            case 'transport': return 'نقل';
            default: return 'معدات';
        }
    };

    const getLastReading = (equipmentId: string): TemperatureReading | undefined => {
        return readings[equipmentId]?.[0];
    };

    const getStatusColor = (reading?: TemperatureReading, eq?: TemperatureEquipment) => {
        if (!reading || !eq) return 'bg-gray-100 border-gray-300';
        if (reading.isCritical) return 'bg-red-50 border-red-300';
        const isWithinLimits = reading.temperature >= eq.minTemp && reading.temperature <= eq.maxTemp;
        if (!isWithinLimits) return 'bg-yellow-50 border-yellow-300';
        return 'bg-green-50 border-green-300';
    };

    if (isLoading) {
        return <PageSkeleton />;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <ThermometerSvg />
                        مراقبة درجات الحرارة
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        تتبع ومراقبة درجات حرارة المعدات والمخازن
                    </p>
                </div>
                <button
                    onClick={() => setShowAddEquipment(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    إضافة معدات
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <span className="text-2xl">🧊</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المعدات</p>
                            <p className="text-xl font-bold">{equipment.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">ضمن الحدود</p>
                            <p className="text-xl font-bold text-green-600">
                                {equipment.filter(eq => {
                                    const r = getLastReading(eq.id);
                                    return r ? (r.temperature >= eq.minTemp && r.temperature <= eq.maxTemp) : false;
                                }).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">تحذيرات</p>
                            <p className="text-xl font-bold text-yellow-600">
                                {equipment.filter(eq => {
                                    const r = getLastReading(eq.id);
                                    const isWithinLimits = r ? (r.temperature >= eq.minTemp && r.temperature <= eq.maxTemp) : false;
                                    return r && !isWithinLimits && !r.isCritical;
                                }).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">حرجة</p>
                            <p className="text-xl font-bold text-red-600">
                                {equipment.filter(eq => getLastReading(eq.id)?.isCritical).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipment.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <span className="text-5xl mb-4 block">🌡️</span>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            لا توجد معدات مسجلة
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            ابدأ بإضافة الثلاجات والفريزرات للمراقبة
                        </p>
                        <button
                            onClick={() => setShowAddEquipment(true)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            إضافة معدات
                        </button>
                    </div>
                ) : (
                    equipment.map(eq => {
                        const lastReading = getLastReading(eq.id);
                        return (
                            <div
                                key={eq.id}
                                className={`rounded-xl p-5 border-2 transition-all ${getStatusColor(lastReading, eq)} dark:bg-gray-800`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{getEquipmentIcon(eq.type)}</span>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{eq.name}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{eq.location}</p>
                                        </div>
                                    </div>
                                    <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
                                        {getEquipmentTypeName(eq.type)}
                                    </span>
                                </div>

                                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-3">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">القراءة الحالية</p>
                                        {lastReading ? (
                                            <p className={`text-4xl font-bold ${lastReading.isCritical ? 'text-red-600' :
                                                !(lastReading.temperature >= eq.minTemp && lastReading.temperature <= eq.maxTemp) ? 'text-yellow-600' :
                                                    'text-green-600'
                                                }`}>
                                                {lastReading.temperature}°C
                                            </p>
                                        ) : (
                                            <p className="text-2xl text-gray-400">--</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            الحدود: {eq.minTemp}°C - {eq.maxTemp}°C
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    {lastReading && (
                                        <span className="text-xs text-gray-500">
                                            آخر تحديث: {new Date(lastReading.timestamp).toLocaleTimeString('ar-EG')}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setShowRecordModal(eq.id)}
                                        className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        تسجيل قراءة
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Equipment Modal */}
            {showAddEquipment && (
                <AddEquipmentModal
                    onClose={() => setShowAddEquipment(false)}
                    onSave={async (data) => {
                        await temperatureService.addEquipment(data);
                        loadData();
                        setShowAddEquipment(false);
                    }}
                />
            )}

            {/* Record Temperature Modal */}
            {showRecordModal && (
                <RecordTemperatureModal
                    equipment={equipment.find(e => e.id === showRecordModal)!}
                    onClose={() => setShowRecordModal(null)}
                    onSave={async (data) => {
                        await temperatureService.recordTemperature(data);
                        loadData();
                        setShowRecordModal(null);
                    }}
                />
            )}
        </div>
    );
};

// Add Equipment Modal
interface AddEquipmentModalProps {
    onClose: () => void;
    onSave: (data: Omit<TemperatureEquipment, 'id'>) => Promise<void>;
}

const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'refrigerator' as EquipmentType,
        location: '',
        minTemp: 0,
        maxTemp: 5,
        unit: '°C',
        monitoringFrequency: 'every_4_hours' as const,
        isActive: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">إضافة معدات جديدة</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">الاسم *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            placeholder="مثال: ثلاجة المواد الخام"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">النوع</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value as EquipmentType })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                        >
                            <option value="refrigerator">🧊 ثلاجة</option>
                            <option value="freezer">❄️ فريزر</option>
                            <option value="cold_room">🏠 غرفة تبريد</option>
                            <option value="hot_holding">🔥 حفظ ساخن</option>
                            <option value="cooking">🍳 طهي</option>
                            <option value="transport">🚚 نقل</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">الموقع</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            placeholder="مثال: المخزن الرئيسي"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">الوحدة</label>
                        <select
                            value={formData.unit}
                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                        >
                            <option value="°C">درجة مئوية (°C)</option>
                            <option value="°F">فهرنهايت (°F)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">الحد الأدنى (°C)</label>
                            <input
                                type="number"
                                value={formData.minTemp}
                                onChange={e => setFormData({ ...formData, minTemp: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">الحد الأقصى (°C)</label>
                            <input
                                type="number"
                                value={formData.maxTemp}
                                onChange={e => setFormData({ ...formData, maxTemp: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            />
                        </div>
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

// Record Temperature Modal
interface RecordTemperatureModalProps {
    equipment: TemperatureEquipment;
    onClose: () => void;
    onSave: (data: Omit<TemperatureReading, 'id'>) => Promise<void>;
}

const RecordTemperatureModal: React.FC<RecordTemperatureModalProps> = ({ equipment, onClose, onSave }) => {
    const [temperature, setTemperature] = useState<number>(0);
    const [notes, setNotes] = useState('');

    const isWithinLimits = temperature >= equipment.minTemp && temperature <= equipment.maxTemp;
    const isCritical = false; // Critical limits are not currently defined in equipment
    // const isCritical = equipment.criticalMinTemp !== undefined && equipment.criticalMaxTemp !== undefined
    //     ? (temperature < equipment.criticalMinTemp || temperature > equipment.criticalMaxTemp)
    //     : false;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({
            equipmentId: equipment.id,
            timestamp: new Date().toISOString(),
            temperature,
            // isWithinLimits, // Removed as it's not in Type/DB
            isCritical,
            recordedBy: 'current-user', // TODO: Get from auth
            notes: notes || '' // Fix: Use empty string instead of undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">تسجيل قراءة</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{equipment.name}</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">درجة الحرارة (°C) *</label>
                        <input
                            type="number"
                            value={isNaN(temperature) ? '' : temperature}
                            onChange={e => setTemperature(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            step="0.1"
                            required
                            className={`w-full px-4 py-3 text-2xl text-center border-2 rounded-lg ${isCritical ? 'border-red-500 bg-red-50' :
                                !isWithinLimits ? 'border-yellow-500 bg-yellow-50' :
                                    'border-green-500 bg-green-50'
                                }`}
                        />
                        <p className="text-xs text-gray-500 mt-1 text-center">
                            الحدود المقبولة: {equipment.minTemp}°C - {equipment.maxTemp}°C
                        </p>
                    </div>
                    {!isWithinLimits && (
                        <div className={`p-3 rounded-lg ${isCritical ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            <p className="font-medium">
                                {isCritical ? '⚠️ قراءة حرجة!' : '⚠️ خارج الحدود المقبولة'}
                            </p>
                            <p className="text-sm">يجب اتخاذ إجراء تصحيحي</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-2">ملاحظات</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            rows={2}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                            إلغاء
                        </button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            تسجيل
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TemperatureMonitoring;
