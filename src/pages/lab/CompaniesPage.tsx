/**
 * Companies Page
 * صفحة إدارة الشركات/العملاء
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    BuildingOfficeIcon,
    PlusIcon,
    PencilIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { useCompanyStore } from '../../store/companyStore';
import * as companyService from '../../services/companyService';
import type { Company } from '../../services/companyService';

const CompaniesPage: React.FC = () => {
    const {
        companies,
        setCompanies,
        selectedCompany,
        selectCompany,
        isLoading: storeLoading,
        setLoading
    } = useCompanyStore();

    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        nameEn: '',
        email: '',
        phone: '',
        address: '',
        taxNumber: '',
        active: true
    });

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        setLoading(true);
        try {
            const data = await companyService.getAllCompanies();
            setCompanies(data);
        } catch (error) {
            console.error('Error loading companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (company?: Company) => {
        if (company) {
            setEditingCompany(company);
            setFormData({
                code: company.code,
                name: company.name,
                nameEn: company.nameEn || '',
                email: company.email || '',
                phone: company.phone || '',
                address: company.address || '',
                taxNumber: company.taxNumber || '',
                active: company.active
            });
        } else {
            setEditingCompany(null);
            setFormData({
                code: '',
                name: '',
                nameEn: '',
                email: '',
                phone: '',
                address: '',
                taxNumber: '',
                active: true
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingCompany) {
                await companyService.updateCompany(editingCompany.id, formData);
            } else {
                await companyService.createCompany(formData);
            }
            await loadCompanies();
            setShowModal(false);
        } catch (error) {
            console.error('Error saving company:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCompany = (id: string) => {
        selectCompany(id);
    };

    const filteredCompanies = useMemo(() => {
        if (!searchQuery) return companies;
        const query = searchQuery.toLowerCase();
        return companies.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.code.toLowerCase().includes(query) ||
            c.nameEn?.toLowerCase().includes(query)
        );
    }, [companies, searchQuery]);

    if (storeLoading && companies.length === 0) {
        return <TableSkeleton />;
    }

    return (
        <div className="p-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BuildingOfficeIcon className="w-8 h-8 text-primary-600" />
                        إدارة الشركات والعملاء
                    </h1>
                    <p className="text-gray-500 mt-1">إدارة قائمة الشركات والعملاء وتحديد سياق العمل</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    إضافة شركة
                </button>
            </div>

            {/* Current Context Alert */}
            {selectedCompany && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                            <BuildingOfficeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">الشركة الحالية</p>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedCompany.name}</h3>
                        </div>
                    </div>
                    <button
                        onClick={() => selectCompany('')} // Clear selection logic needs to be handled in store if passing empty string works, or assume selectCompany handles it. Store interface says string. I'll fix store to allow null or handle empty string.
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        إلغاء التحديد
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="بحث عن شركة..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Companies Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الشركة</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الكود</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الهاتف</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">العنوان</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">الحالة</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {/* Sort to put selected company first */}
                        {[...filteredCompanies]
                            .sort((a, b) => {
                                if (selectedCompany?.id === a.id) return -1;
                                if (selectedCompany?.id === b.id) return 1;
                                return 0;
                            })
                            .map(company => (
                                <tr
                                    key={company.id}
                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${selectedCompany?.id === company.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-r-primary-500'
                                        : ''
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${selectedCompany?.id === company.id
                                                ? 'bg-primary-100 dark:bg-primary-900/30'
                                                : 'bg-gray-100 dark:bg-gray-700'
                                                }`}>
                                                <BuildingOfficeIcon className={`w-5 h-5 ${selectedCompany?.id === company.id
                                                    ? 'text-primary-600'
                                                    : 'text-gray-500'
                                                    }`} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                    {company.name}
                                                    {selectedCompany?.id === company.id && (
                                                        <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded-full">
                                                            الشركة الرئيسية
                                                        </span>
                                                    )}
                                                </div>
                                                {company.nameEn && (
                                                    <div className="text-xs text-gray-500" dir="ltr">{company.nameEn}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">
                                        {company.code}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400" dir="ltr">
                                        {company.phone || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                        {company.address || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${company.active
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {company.active ? <CheckCircleIcon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                                            {company.active ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleOpenModal(company)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                                                title="تعديل"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            {selectedCompany?.id !== company.id ? (
                                                <button
                                                    onClick={() => handleSelectCompany(company.id)}
                                                    className="px-3 py-1 text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-lg"
                                                >
                                                    تحديد كرئيسية
                                                </button>
                                            ) : (
                                                <span className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-1">
                                                    <CheckCircleIcon className="w-3 h-3" />
                                                    محددة
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                {filteredCompanies.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        <BuildingOfficeIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p>لا توجد شركات</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingCompany ? 'تعديل بيانات الشركة' : 'إضافة شركة جديدة'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">كود الشركة *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">اسم الشركة (عربي) *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">اسم الشركة (إنجليزي)</label>
                                    <input
                                        type="text"
                                        value={formData.nameEn}
                                        onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-left"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">الرقم الضريبي</label>
                                    <input
                                        type="text"
                                        value={formData.taxNumber}
                                        onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">الهاتف</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-left"
                                        dir="ltr"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-left"
                                        dir="ltr"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">العنوان</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                        rows={3}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.active}
                                            onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                            className="rounded text-primary-600"
                                        />
                                        <span>نشط</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
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

export default CompaniesPage;
