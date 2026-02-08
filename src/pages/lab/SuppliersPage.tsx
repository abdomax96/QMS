/**
 * Suppliers Page - Simplified Version
 * صفحة إدارة الموردين - نسخة مبسطة
 * Updated: Full Supabase CRUD integration
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    CheckBadgeIcon,
    XMarkIcon,
    BuildingOfficeIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { useSuppliers } from '../../hooks/useMasterData';
import * as masterDataService from '../../services/masterDataService';
import { generateSupplierCode } from '../../domain/masterData/types';
import type { Supplier } from '../../domain/masterData/types';
import { useCompanyStore } from '../../store/companyStore';

const SuppliersPage: React.FC = () => {
    const { suppliers, isLoading, error, refetch } = useSuppliers();
    const { selectedCompany } = useCompanyStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        approved: false
    });

    const filteredSuppliers = useMemo(() => {
        if (!searchQuery) return suppliers;
        const query = searchQuery.toLowerCase();
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.code.toLowerCase().includes(query) ||
            s.contactPerson?.toLowerCase().includes(query)
        );
    }, [suppliers, searchQuery]);

    const stats = useMemo(() => ({
        total: suppliers.length,
        approved: suppliers.filter(s => s.approved).length,
        notApproved: suppliers.filter(s => !s.approved).length
    }), [suppliers]);

    const openAddModal = () => {
        setEditingSupplier(null);
        setFormData({
            code: generateSupplierCode(),
            name: '',
            contactPerson: '',
            phone: '',
            email: '',
            address: '',
            approved: false
        });
        setShowModal(true);
    };

    const openEditModal = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            code: supplier.code,
            name: supplier.name,
            contactPerson: supplier.contactPerson || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            approved: supplier.approved
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        if (editingSupplier) {
            await masterDataService.updateSupplier(editingSupplier.id, formData);
        } else {
            await masterDataService.createSupplier(formData, selectedCompany?.id);
        }

        setShowModal(false);
        refetch();
    };

    const handleDelete = async (id: string) => {
        await masterDataService.deleteSupplier(id);
        setShowDeleteConfirm(null);
        refetch();
    };

    const handleToggleApproval = async (supplier: Supplier) => {
        await masterDataService.updateSupplier(supplier.id, {
            approved: !supplier.approved
        });
        refetch();
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <TableSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Back Button */}
            <Link
                to="/lab"
                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition-colors"
            >
                <ArrowRightIcon className="w-5 h-5" />
                <span>العودة للمختبر</span>
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
                        الموردين
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة بيانات الموردين المعتمدين</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                    <PlusIcon className="w-5 h-5" />
                    مورد جديد
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                    <div className="text-sm text-gray-500">إجمالي</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                    <div className="text-sm text-gray-500">معتمد</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.notApproved}</div>
                    <div className="text-sm text-gray-500">غير معتمد</div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو الكود..."
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
                />
            </div>

            {/* Suppliers List */}
            {filteredSuppliers.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <BuildingOfficeIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">لا يوجد موردين</h3>
                    <p className="text-gray-500 mb-6">ابدأ بإضافة مورد جديد</p>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                    >
                        <PlusIcon className="w-5 h-5" />
                        مورد جديد
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الكود</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">اسم المورد</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">جهة الاتصال</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الهاتف</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredSuppliers.map(supplier => (
                                <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-sm text-blue-600">{supplier.code}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium text-gray-900 dark:text-white">{supplier.name}</div>
                                            {supplier.approved && (
                                                <CheckBadgeIcon className="w-5 h-5 text-green-500" title="معتمد" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                        {supplier.contactPerson || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400" dir="ltr">
                                        {supplier.phone || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleToggleApproval(supplier)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${supplier.approved
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30'
                                                }`}
                                        >
                                            {supplier.approved ? 'معتمد' : 'غير معتمد'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => openEditModal(supplier)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                title="تعديل"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(supplier.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                title="حذف"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold">
                                {editingSupplier ? 'تعديل مورد' : 'مورد جديد'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">كود المورد</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">اسم المورد *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">جهة الاتصال</label>
                                    <input
                                        type="text"
                                        value={formData.contactPerson}
                                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">الهاتف</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                    dir="ltr"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">العنوان</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.approved}
                                        onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                                    />
                                    <span className="text-sm">مورد معتمد</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm m-4">
                        <h3 className="text-lg font-bold mb-2">تأكيد الحذف</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">هل أنت متأكد من حذف هذا المورد؟</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => handleDelete(showDeleteConfirm)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuppliersPage;
