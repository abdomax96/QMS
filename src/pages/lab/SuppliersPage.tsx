/**
 * Suppliers Page - Table UI (Excel-like)
 * صفحة إدارة الموردين - عرض جدولي
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowPathIcon,
    ArrowRightIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { FormattedDate } from '../../components/common/FormattedDate';
import { useSuppliers } from '../../hooks/useMasterData';
import * as masterDataService from '../../services/masterDataService';
import { generateSupplierCode } from '../../domain/masterData/types';
import type { Supplier } from '../../domain/masterData/types';
import { useCompanyStore } from '../../store/companyStore';
import HrSortableHeader from '../../modules/hr/components/HrSortableHeader';
import HrTablePager from '../../modules/hr/components/HrTablePager';
import { HrDataGrid, HrPageShell, HrSectionCard } from '../../modules/hr/components/HrPageShell';
import { usePaginatedRows } from '../../modules/hr/hooks/usePaginatedRows';
import {
    createBooleanSorter,
    createDateSorter,
    createTextSorter,
    useSortableRows,
} from '../../modules/hr/hooks/useSortableRows';
import { cn } from '../../utils';

const SuppliersPage: React.FC = () => {
    const { suppliers, isLoading, error, refetch } = useSuppliers();
    const { selectedCompany, companies, selectCompany } = useCompanyStore();

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
        approved: false,
    });

    const filteredSuppliers = useMemo(() => {
        if (!searchQuery) return suppliers;
        const query = searchQuery.toLowerCase();
        return suppliers.filter((supplier) =>
            [supplier.name, supplier.code, supplier.contactPerson, supplier.phone, supplier.email, supplier.address]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [suppliers, searchQuery]);

    const stats = useMemo(
        () => ({
            total: suppliers.length,
            approved: suppliers.filter((s) => s.approved).length,
            notApproved: suppliers.filter((s) => !s.approved).length,
        }),
        [suppliers]
    );

    const supplierSorters = useMemo(
        () => ({
            code: createTextSorter<Supplier>((row) => row.code),
            name: createTextSorter<Supplier>((row) => row.name),
            contactPerson: createTextSorter<Supplier>((row) => row.contactPerson),
            phone: createTextSorter<Supplier>((row) => row.phone),
            email: createTextSorter<Supplier>((row) => row.email),
            address: createTextSorter<Supplier>((row) => row.address),
            approved: createBooleanSorter<Supplier>((row) => row.approved),
            updatedAt: createDateSorter<Supplier>((row) => row.updatedAt),
        }),
        []
    );

    const { sortedRows, sortKey, sortDirection, toggleSort } = useSortableRows({
        rows: filteredSuppliers,
        sorters: supplierSorters,
        initialSortKey: 'name',
    });

    const {
        page,
        setPage,
        pageCount,
        pageSize,
        setPageSize,
        pagedRows,
        totalRows,
        fromRow,
        toRow,
        offset,
    } = usePaginatedRows({
        rows: sortedRows,
        initialPageSize: 50,
    });

    const openAddModal = () => {
        setEditingSupplier(null);
        setFormData({
            code: generateSupplierCode(),
            name: '',
            contactPerson: '',
            phone: '',
            email: '',
            address: '',
            approved: false,
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
            approved: supplier.approved,
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
            approved: !supplier.approved,
        });
        refetch();
    };

    const pageBody = () => {
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
                    <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                        {error}
                    </div>
                </div>
            );
        }

        return (
            <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        to="/lab"
                        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300"
                    >
                        <ArrowRightIcon className="h-4 w-4" />
                        العودة للمختبر
                    </Link>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>الشركة</span>
                            <select
                                value={selectedCompany?.id || ''}
                                onChange={(e) => selectCompany(e.target.value)}
                                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                            >
                                <option value="" disabled>
                                    اختر شركة
                                </option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <button
                            type="button"
                            onClick={() => void refetch()}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                            title="تحديث"
                        >
                            <ArrowPathIcon className="h-4 w-4" />
                            تحديث
                        </button>

                        <button
                            type="button"
                            onClick={openAddModal}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                            <PlusIcon className="h-4 w-4" />
                            مورد جديد
                        </button>
                    </div>
                </div>

                <HrSectionCard
                    title="الموردين"
                    actions={
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                            <div className="relative">
                                <MagnifyingGlassIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="بحث سريع..."
                                    className="h-9 w-full min-w-[220px] rounded-md border border-slate-200 bg-white pr-8 pl-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>الإجمالي: {stats.total}</span>
                                <span>معتمد: {stats.approved}</span>
                                <span>غير معتمد: {stats.notApproved}</span>
                            </div>
                        </div>
                    }
                >
                    {sortedRows.length === 0 ? (
                        <div className="rounded-md border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                            {suppliers.length === 0 ? 'لا توجد بيانات' : 'لا توجد نتائج'}
                        </div>
                    ) : (
                        <HrDataGrid
                            rowCount={sortedRows.length}
                            columnCount={10}
                            footer={
                                <HrTablePager
                                    page={page}
                                    pageCount={pageCount}
                                    pageSize={pageSize}
                                    totalRows={totalRows}
                                    fromRow={fromRow}
                                    toRow={toRow}
                                    onPageChange={setPage}
                                    onPageSizeChange={setPageSize}
                                />
                            }
                        >
                            <table>
                                <thead>
                                    <tr>
                                        <th className="w-10 text-center">#</th>
                                        <th>
                                            <HrSortableHeader
                                                label="الكود"
                                                sortKey="code"
                                                activeSortKey={sortKey}
                                                sortDirection={sortDirection}
                                                onToggle={toggleSort}
                                            />
                                        </th>
                                        <th>
                                            <HrSortableHeader
                                                label="اسم المورد"
                                                sortKey="name"
                                                activeSortKey={sortKey}
                                                sortDirection={sortDirection}
                                                onToggle={toggleSort}
                                            />
                                        </th>
                                        <th>
                                            <HrSortableHeader
                                                label="جهة الاتصال"
                                                sortKey="contactPerson"
                                                activeSortKey={sortKey}
                                                sortDirection={sortDirection}
                                                onToggle={toggleSort}
                                            />
                                        </th>
                                        <th>
                                            <HrSortableHeader
                                                label="الهاتف"
                                                sortKey="phone"
                                                activeSortKey={sortKey}
                                                sortDirection={sortDirection}
                                                onToggle={toggleSort}
                                            />
                                        </th>
                                        <th>
                                            <HrSortableHeader
                                                label="البريد"
                                                sortKey="email"
                                                activeSortKey={sortKey}
                                                sortDirection={sortDirection}
                                                onToggle={toggleSort}
                                            />
                                        </th>
                                        <th className="min-w-[260px]">
                                            <HrSortableHeader
                                                label="العنوان"
                                                sortKey="address"
                                                activeSortKey={sortKey}
                                                sortDirection={sortDirection}
                                                onToggle={toggleSort}
                                            />
                                        </th>
                                        <th>
                                            <HrSortableHeader
                                                label="الاعتماد"
                                                sortKey="approved"
                                                activeSortKey={sortKey}
                                                sortDirection={sortDirection}
                                                onToggle={toggleSort}
                                            />
                                        </th>
                                        <th className="whitespace-nowrap">
                                            <HrSortableHeader
                                                label="آخر تحديث"
                                                sortKey="updatedAt"
                                                activeSortKey={sortKey}
                                                sortDirection={sortDirection}
                                                onToggle={toggleSort}
                                            />
                                        </th>
                                        <th className="text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedRows.map((supplier, index) => (
                                        <tr key={supplier.id}>
                                            <td className="text-center font-mono text-[11px] text-slate-400 dark:text-slate-500">
                                                {offset + index + 1}
                                            </td>
                                            <td className="whitespace-nowrap font-mono text-emerald-700 dark:text-emerald-300">
                                                {supplier.code}
                                            </td>
                                            <td className="min-w-[200px] font-semibold text-slate-900 dark:text-slate-100">
                                                {supplier.name}
                                            </td>
                                            <td className="whitespace-nowrap">{supplier.contactPerson || '-'}</td>
                                            <td className="whitespace-nowrap font-mono" dir="ltr">
                                                {supplier.phone || '-'}
                                            </td>
                                            <td className="whitespace-nowrap font-mono" dir="ltr">
                                                {supplier.email || '-'}
                                            </td>
                                            <td className="min-w-[260px]">{supplier.address || '-'}</td>
                                            <td className="whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleToggleApproval(supplier)}
                                                    className={cn(
                                                        'rounded-full px-2 py-1 text-[11px] font-semibold transition',
                                                        supplier.approved
                                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30'
                                                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30'
                                                    )}
                                                >
                                                    {supplier.approved ? 'معتمد' : 'غير معتمد'}
                                                </button>
                                            </td>
                                            <td className="whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                                <FormattedDate date={supplier.updatedAt} includeTime />
                                            </td>
                                            <td className="whitespace-nowrap text-center">
                                                <div className="inline-flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(supplier)}
                                                        className="inline-flex items-center justify-center rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                                                        title="تعديل"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDeleteConfirm(supplier.id)}
                                                        className="inline-flex items-center justify-center rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-slate-700 dark:text-rose-200 dark:hover:bg-rose-950/30"
                                                        title="حذف"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </HrDataGrid>
                    )}
                </HrSectionCard>

                {/* Add/Edit Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white m-4 dark:bg-gray-800">
                            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
                                <h2 className="text-xl font-bold">{editingSupplier ? 'تعديل مورد' : 'مورد جديد'}</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4 p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">كود المورد</label>
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">اسم المورد *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">جهة الاتصال</label>
                                        <input
                                            type="text"
                                            value={formData.contactPerson}
                                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">الهاتف</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">البريد الإلكتروني</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                                        dir="ltr"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">العنوان</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.approved}
                                            onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300 text-primary-600"
                                        />
                                        <span className="text-sm">مورد معتمد</span>
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700"
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
                        <div className="max-w-sm rounded-xl bg-white p-6 m-4 dark:bg-gray-800">
                            <h3 className="mb-2 text-lg font-bold">تأكيد الحذف</h3>
                            <p className="mb-4 text-gray-600 dark:text-gray-400">هل أنت متأكد من حذف هذا المورد؟</p>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleDelete(showDeleteConfirm)}
                                    className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
                                >
                                    حذف
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <HrPageShell title="الموردين" description="" stats={[]}>
            {pageBody()}
        </HrPageShell>
    );
};

export default SuppliersPage;

