/**
 * Lab Equipment Manager Component
 * مدير سجل أجهزة المختبر
 */

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Wrench } from 'lucide-react';
import { labEquipmentService } from '../../services/labEquipmentService';
import type { LabEquipment, CreateLabEquipmentData } from '../../types/labTests';

const emptyForm: CreateLabEquipmentData = {
    code: '',
    name: '',
    name_ar: '',
    description: '',
    location: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    is_active: true
};

const EquipmentManager: React.FC = () => {
    const [equipment, setEquipment] = useState<LabEquipment[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<LabEquipment | null>(null);
    const [formData, setFormData] = useState<CreateLabEquipmentData>(emptyForm);

    useEffect(() => {
        loadEquipment();
    }, []);

    const loadEquipment = async () => {
        setLoading(true);
        try {
            const data = await labEquipmentService.getEquipment();
            setEquipment(data);
        } catch (error) {
            console.error('Failed to load equipment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingEquipment) {
                await labEquipmentService.updateEquipment(editingEquipment.id, formData);
            } else {
                await labEquipmentService.createEquipment(formData);
            }
            await loadEquipment();
            handleCloseModal();
        } catch (error) {
            console.error('Failed to save equipment:', error);
            alert('فشل حفظ الجهاز');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: LabEquipment) => {
        setEditingEquipment(item);
        setFormData({
            code: item.code || '',
            name: item.name,
            name_ar: item.name_ar || '',
            description: item.description || '',
            location: item.location || '',
            manufacturer: item.manufacturer || '',
            model: item.model || '',
            serial_number: item.serial_number || '',
            is_active: item.is_active
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return;

        setLoading(true);
        try {
            await labEquipmentService.deleteEquipment(id);
            await loadEquipment();
        } catch (error) {
            console.error('Failed to delete equipment:', error);
            alert('فشل حذف الجهاز');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEquipment(null);
        setFormData(emptyForm);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Lab Equipment</h2>
                    <p className="text-sm text-gray-500 mt-1">سجل أجهزة المختبر</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    <span>جهاز جديد</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Loading...</p>
                </div>
            ) : equipment.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد أجهزة مسجلة</p>
                    <p className="text-sm text-gray-400 mt-1">قم بإضافة جهاز جديد للربط بالفحوصات</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipment.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{item.name_ar || item.name}</h3>
                                    <p className="text-xs text-gray-500">{item.code || 'بدون كود'}</p>
                                </div>
                                <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                        item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {item.is_active ? 'نشط' : 'متوقف'}
                                </span>
                            </div>

                            <div className="text-xs text-gray-500 space-y-1">
                                <div>الموقع: {item.location || '-'}</div>
                                <div>الموديل: {item.model || '-'}</div>
                                <div>الرقم التسلسلي: {item.serial_number || '-'}</div>
                            </div>

                            <div className="mt-3">
                                <div className="text-xs text-gray-500 mb-1">الفحوصات المرتبطة</div>
                                <div className="flex flex-wrap gap-2">
                                    {(item.linked_tests || []).length === 0 && (
                                        <span className="text-xs text-gray-400">لا توجد فحوصات</span>
                                    )}
                                    {(item.linked_tests || []).slice(0, 3).map((test) => (
                                        <span
                                            key={test.id}
                                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                                        >
                                            {test.name_ar || test.name}
                                        </span>
                                    ))}
                                    {(item.linked_tests || []).length > 3 && (
                                        <span className="text-xs text-gray-400">
                                            +{(item.linked_tests || []).length - 3} أخرى
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    تعديل
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="flex items-center gap-1 text-sm text-red-600 hover:underline"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingEquipment ? 'تعديل الجهاز' : 'إضافة جهاز جديد'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الكود</label>
                                    <input
                                        type="text"
                                        value={formData.code || ''}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (عربي)</label>
                                    <input
                                        type="text"
                                        value={formData.name_ar || ''}
                                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        dir="rtl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الموقع</label>
                                    <input
                                        type="text"
                                        value={formData.location || ''}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الشركة المصنعة</label>
                                    <input
                                        type="text"
                                        value={formData.manufacturer || ''}
                                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الموديل</label>
                                    <input
                                        type="text"
                                        value={formData.model || ''}
                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الرقم التسلسلي</label>
                                    <input
                                        type="text"
                                        value={formData.serial_number || ''}
                                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-6">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active !== false}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                    />
                                    <label className="text-sm text-gray-700">نشط</label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                >
                                    حفظ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentManager;
