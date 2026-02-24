/**
 * Document Form Component - نموذج إنشاء/تعديل الوثيقة
 */

import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    DocumentTextIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';
import { documentService, type CreateDocumentInput, type Document } from '../../services/documentService';
import type { Product } from '../../types/product';
import { useToastStore } from '../../store/toastStore';
import { usePermissions } from '../../hooks/usePermissions';
import { cn } from '../../utils';

const DOCUMENT_TYPES = [
    { value: 'sop', label: 'إجراء تشغيل قياسي (SOP)', labelEn: 'SOP' },
    { value: 'work_instruction', label: 'تعليمات العمل', labelEn: 'Work Instruction' },
    { value: 'manual', label: 'دليل', labelEn: 'Manual' },
    { value: 'form', label: 'نموذج', labelEn: 'Form' },
    { value: 'policy', label: 'سياسة', labelEn: 'Policy' },
    { value: 'specification', label: 'مواصفة', labelEn: 'Specification' },
    { value: 'other', label: 'أخرى', labelEn: 'Other' }
];

interface Department {
    id: string;
    name: string;
}

interface Company {
    id: string;
    name: string;
}

type CompanyProduct = Pick<Product, 'id' | 'name' | 'sku'>;

interface DocumentFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (doc: Document) => void;
    editDocument?: Document | null;
}

export default function DocumentForm({ isOpen, onClose, onSuccess, editDocument }: DocumentFormProps) {
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [userDepartments, setUserDepartments] = useState<Department[]>([]);
    const [companyProducts, setCompanyProducts] = useState<CompanyProduct[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [initialSopProductIds, setInitialSopProductIds] = useState<string[]>([]);
    const { addToast } = useToastStore();
    const { can } = usePermissions();

    // Check if user can see all documents (can select any department)
    const canViewAllDocuments = can('documents', 'view_all_documents');

    // Form state
    const [formData, setFormData] = useState<CreateDocumentInput>({
        title: '',
        title_ar: '',
        description: '',
        type: 'sop',
        category: '',
        department_id: undefined,
        company_id: undefined,
        content: ''
    });

    // Load departments and companies
    useEffect(() => {
        const fetchData = async () => {
            // Get current user
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user?.id) return;

            // Fetch companies
            const { data: companiesData } = await supabase
                .from('companies')
                .select('id, name')
                .order('name');
            setCompanies(companiesData || []);

            // Fetch user's departments from user_departments

            // Fetch user's company ID
            const { data: userCompanyId } = await supabase.rpc('get_user_company_id');

            if (!editDocument && userCompanyId) {
                setFormData(prev => ({ ...prev, company_id: userCompanyId }));
            }

            // Fetch user's departments from user_departments
            const { data: userDeptLinks } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', userData.user.id)
                .eq('is_active', true);

            const userDeptIds = userDeptLinks?.map(d => d.department_id) || [];

            // Fetch all departments
            const { data: allDepts } = await supabase
                .from('departments')
                .select('id, name')
                .order('name');

            setDepartments(allDepts || []);

            // Filter user's departments
            const userDepts = (allDepts || []).filter(d => userDeptIds.includes(d.id));
            setUserDepartments(userDepts);

            // Auto-set department if user has only one department and not editing
            if (!editDocument && userDepts.length === 1) {
                setFormData(prev => ({ ...prev, department_id: userDepts[0].id }));
            }
        };
        fetchData();
    }, [editDocument]);

    // Populate form when editing
    useEffect(() => {
        if (editDocument) {
            setFormData({
                title: editDocument.title,
                title_ar: editDocument.title_ar || '',
                description: editDocument.description || '',
                type: editDocument.type,
                category: editDocument.category || '',
                department_id: editDocument.department_id,
                company_id: editDocument.company_id,
            });
        } else {
            // Reset form for new document (department will be set by fetchDepartments)
            setFormData(prev => ({
                title: '',
                title_ar: '',
                description: '',
                type: 'sop',
                category: '',
                department_id: prev.department_id, // Keep auto-assigned department
                company_id: prev.company_id,
                content: ''
            }));
            setSelectedProductIds([]);
            setInitialSopProductIds([]);
            setProductSearchQuery('');
        }
    }, [editDocument, isOpen]);

    useEffect(() => {
        const fetchCompanyProducts = async () => {
            if (!formData.company_id || formData.type !== 'sop') {
                setCompanyProducts([]);
                setSelectedProductIds([]);
                setProductSearchQuery('');
                return;
            }

            try {
                setLoadingProducts(true);
                const { data, error } = await supabase
                    .from('products')
                    .select('id, name, sku')
                    .eq('company_id', formData.company_id)
                    .order('name');

                if (error) throw error;
                setCompanyProducts(data || []);
            } catch (err) {
                console.error('Error fetching company products:', err);
                setCompanyProducts([]);
            } finally {
                setLoadingProducts(false);
            }
        };

        if (isOpen) {
            fetchCompanyProducts();
        }
    }, [formData.company_id, formData.type, isOpen]);

    useEffect(() => {
        const loadAssignedProducts = async () => {
            if (!editDocument?.id || !formData.company_id || formData.type !== 'sop') {
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('id')
                    .eq('company_id', formData.company_id)
                    .eq('sop_document_id', editDocument.id);

                if (error) throw error;
                const ids = (data || []).map((item: { id: string }) => item.id);
                setSelectedProductIds(ids);
                setInitialSopProductIds(ids);
            } catch (err) {
                console.error('Error loading SOP linked products:', err);
                setSelectedProductIds([]);
                setInitialSopProductIds([]);
            }
        };

        if (isOpen) {
            loadAssignedProducts();
        }
    }, [editDocument?.id, formData.company_id, formData.type, isOpen]);

    const normalizedProductSearch = productSearchQuery.trim().toLowerCase();
    const filteredCompanyProducts = companyProducts.filter((product) =>
        product.name.toLowerCase().includes(normalizedProductSearch) ||
        (product.sku || '').toLowerCase().includes(normalizedProductSearch)
    );

    const visibleProductIds = filteredCompanyProducts.map((product) => product.id);
    const allVisibleSelected =
        visibleProductIds.length > 0 &&
        visibleProductIds.every((id) => selectedProductIds.includes(id));

    const toggleVisibleProducts = () => {
        if (visibleProductIds.length === 0) return;

        if (allVisibleSelected) {
            setSelectedProductIds((prev) => prev.filter((id) => !visibleProductIds.includes(id)));
            return;
        }

        setSelectedProductIds((prev) => Array.from(new Set([...prev, ...visibleProductIds])));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.title.trim()) {
            addToast({ type: 'error', message: 'يرجى إدخال عنوان الوثيقة' });
            return;
        }

        setLoading(true);
        try {
            let result: Document;

            if (editDocument) {
                // Update existing
                result = await documentService.updateDocument(editDocument.id, formData);
                addToast({ type: 'success', message: 'تم تحديث الوثيقة بنجاح' });
            } else {
                // Create new
                result = await documentService.createDocument(formData);
                addToast({ type: 'success', message: `تم إنشاء الوثيقة: ${result.document_number}` });
            }

            // Sync SOP products if applicable
            try {
                if (formData.type === 'sop') {
                    const toAssign = selectedProductIds;
                    const toUnassign = initialSopProductIds.filter(id => !selectedProductIds.includes(id));

                    if (toAssign.length > 0) {
                        const { error: assignError } = await supabase
                            .from('products')
                            .update({ sop_document_id: result.id })
                            .in('id', toAssign);

                        if (assignError) throw assignError;
                    }

                    if (toUnassign.length > 0) {
                        const { error: unassignError } = await supabase
                            .from('products')
                            .update({ sop_document_id: null })
                            .in('id', toUnassign);

                        if (unassignError) throw unassignError;
                    }
                } else if (editDocument && initialSopProductIds.length > 0) {
                    const { error: clearError } = await supabase
                        .from('products')
                        .update({ sop_document_id: null })
                        .in('id', initialSopProductIds);

                    if (clearError) throw clearError;
                }
            } catch (syncError) {
                console.error('Error syncing SOP products:', syncError);
                addToast({ type: 'warning', message: 'تم حفظ الوثيقة لكن تعذر تحديث ربط المنتجات' });
            }

            onSuccess(result);
            onClose();
        } catch (err: any) {
            console.error('Error saving document:', err);
            addToast({ type: 'error', message: err.message || 'فشل حفظ الوثيقة' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-end sm:items-center justify-center p-2 sm:p-4">
                <div className="relative bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-0.75rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col transform transition-all">
                    {/* Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                                <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                                {editDocument ? 'تعديل الوثيقة' : 'وثيقة جديدة'}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="min-h-[40px] min-w-[40px] p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">

                        {/* Content Notice - Only for new documents */}
                        {!editDocument && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h4 className="font-medium text-sm sm:text-base text-blue-800 dark:text-blue-300 mb-1">
                                    معلومات الوثيقة
                                </h4>
                                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                                    قم بإدخال البيانات الأساسية للوثيقة أولاً. سيتم نقلك إلى المحرر المتقدم لإضافة المحتوى وتنسيقه بعد الحفظ.
                                </p>
                            </div>
                        )}

                        {/* Title */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    العنوان (بالعربية) *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="أدخل عنوان الوثيقة"
                                    dir="rtl"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Title (English)
                                </label>
                                <input
                                    type="text"
                                    value={formData.title_ar || ''}
                                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Enter document title"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        {/* Type & Department */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    نوع الوثيقة *
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    {DOCUMENT_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    القسم {!canViewAllDocuments && userDepartments.length <= 1 ? '' : '*'}
                                </label>
                                {/* Show dropdown only if user has view_all_documents or multiple departments */}
                                {canViewAllDocuments || userDepartments.length > 1 ? (
                                    <select
                                        value={formData.department_id || ''}
                                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value || undefined })}
                                        className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        {canViewAllDocuments && <option value="">-- جميع الأقسام --</option>}
                                        {(canViewAllDocuments ? departments : userDepartments).map(dept => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    // Show read-only text if user has only one department
                                    <div className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {userDepartments[0]?.name || 'لم يتم تعيين قسم'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Company Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                الشركة
                            </label>
                            <select
                                value={formData.company_id || ''}
                                onChange={(e) => setFormData({ ...formData, company_id: e.target.value || undefined })}
                                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="">-- اختر الشركة --</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Product Selection (SOP only) */}
                        {formData.type === 'sop' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    المنتجات المرتبطة بـ SOP
                                </label>
                                {!formData.company_id ? (
                                    <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                                        يرجى اختيار الشركة أولاً لعرض المنتجات
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                value={productSearchQuery}
                                                onChange={(e) => setProductSearchQuery(e.target.value)}
                                                placeholder="بحث في المنتجات بالاسم أو الكود"
                                                className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={toggleVisibleProducts}
                                                disabled={loadingProducts || visibleProductIds.length === 0}
                                                className="min-h-[34px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                                            >
                                                {allVisibleSelected ? 'إلغاء تحديد الظاهر' : 'تحديد الظاهر'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProductIds([])}
                                                disabled={loadingProducts || selectedProductIds.length === 0}
                                                className="min-h-[34px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-50"
                                            >
                                                مسح الكل
                                            </button>
                                        </div>

                                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-56 overflow-auto bg-white dark:bg-slate-800">
                                            {loadingProducts ? (
                                                <div className="text-sm text-slate-500">جاري تحميل المنتجات...</div>
                                            ) : companyProducts.length === 0 ? (
                                                <div className="text-sm text-slate-500">لا توجد منتجات لهذه الشركة</div>
                                            ) : filteredCompanyProducts.length === 0 ? (
                                                <div className="text-sm text-slate-500">لا توجد نتائج مطابقة للبحث</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {filteredCompanyProducts.map(product => (
                                                        <label key={product.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                                checked={selectedProductIds.includes(product.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedProductIds(prev => [...prev, product.id]);
                                                                    } else {
                                                                        setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                                                                    }
                                                                }}
                                                            />
                                                            <span className="break-words">
                                                                {product.name}
                                                                {product.sku ? <span className="text-xs text-slate-500 ms-2">({product.sku})</span> : null}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {formData.company_id && companyProducts.length > 0 && (
                                    <p className="text-xs text-slate-500 mt-2">
                                        تم اختيار {selectedProductIds.length} من {companyProducts.length} منتج
                                    </p>
                                )}
                                <p className="text-xs text-slate-500 mt-2">
                                    اختر المنتجات التي سيتم ربطها بهذه الوثيقة (SOP).
                                </p>
                            </div>
                        )}

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                التصنيف
                            </label>
                            <input
                                type="text"
                                value={formData.category || ''}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="مثال: الجودة، الإنتاج، السلامة"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                الوصف
                            </label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                                placeholder="وصف مختصر للوثيقة"
                            />
                        </div>

                        {/* Document Editor - Only visible when editing or if user wants to add content directly (optional) */}
                        {/* 
                            We removed the editor from the main creation flow to separate metadata from content. 
                            Users will be redirected to the full editor after creation.
                        */}

                        {/* Actions */}
                        <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-3 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="min-h-[44px] px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "min-h-[44px] px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center justify-center gap-2",
                                    loading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        جاري الحفظ...
                                    </>
                                ) : (
                                    editDocument ? 'حفظ التغييرات' : 'حفظ ومتابعة للمحرر'
                                )}
                            </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div >
        </div >
    );
}
