/**
 * Products Management Page
 * صفحة إدارة المنتجات وخطوط الإنتاج
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CubeIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    CheckIcon,
    XMarkIcon,
    BeakerIcon
} from '@heroicons/react/24/outline';
import * as productService from '../../services/productService';
import { useCompanyStore } from '../../store/companyStore';
import { supabase } from '../../config/supabase';
import type { Product, ProductionLine, ProductCategory } from '../../types/product';
import { PRODUCT_CATEGORIES, COMMON_ALLERGENS } from '../../types/product';
import RecipeManager from '../../components/recipes/RecipeManager';
import { TableSkeleton } from '../../components/common/LoadingStates';

interface SopDocument {
    id: string;
    title: string;
    title_ar?: string | null;
    document_number: string;
    status: string;
}

const ProductsPage: React.FC = () => {
    const navigate = useNavigate();
    const { companies, selectedCompany } = useCompanyStore();

    // IMPORTANT: Company selection inside this page is a local filter ONLY.
    // The main company is set only from "Companies & Clients" tab.
    const STORAGE_KEY = 'qms.settings.products.pageCompanyId';
    const [pageCompanyId, setPageCompanyId] = useState<string>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || selectedCompany?.id || '';
        } catch {
            return selectedCompany?.id || '';
        }
    });
    const pageCompany = useMemo(
        () => companies.find(c => c.id === pageCompanyId) || null,
        [companies, pageCompanyId]
    );
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [productsAllergens, setProductsAllergens] = useState<Map<string, string[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
    const [sopDocuments, setSopDocuments] = useState<SopDocument[]>([]);

    // Modal states
    const [showLineModal, setShowLineModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showRecipeManager, setShowRecipeManager] = useState(false);
    const [selectedProductForRecipes, setSelectedProductForRecipes] = useState<Product | null>(null);
    const [editingLine, setEditingLine] = useState<ProductionLine | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [selectedLineId, setSelectedLineId] = useState<string>('');

    // Form states
    const [lineForm, setLineForm] = useState({ name: '', code: '', description: '' });
    const [productForm, setProductForm] = useState({
        name: '',
        sku: '',
        barcode: '',
        category: 'other' as ProductCategory,
        unit: 'قطعة',
        shelf_life_days: 0,
        storage_conditions: '',
        allergens: [] as string[],
        sop_document_id: null as string | null
    });

    useEffect(() => {
        loadData();
    }, [pageCompanyId]);

    useEffect(() => {
        // On first mount (or if store initializes later), use the store's selection as default.
        if (!pageCompanyId && selectedCompany?.id) {
            setPageCompanyId(selectedCompany.id);
        }

        // If a stored companyId is no longer available in the list, fall back.
        if (pageCompanyId && companies.length > 0 && !companies.some(c => c.id === pageCompanyId)) {
            const fallbackId = selectedCompany?.id || '';
            setPageCompanyId(fallbackId);
        }
    }, [pageCompanyId, selectedCompany?.id, companies]);

    useEffect(() => {
        // Persist per-page selection only (does not set main company).
        try {
            if (pageCompanyId) {
                localStorage.setItem(STORAGE_KEY, pageCompanyId);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // ignore storage errors (private mode, blocked storage, etc.)
        }
    }, [pageCompanyId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [linesData, productsData] = await Promise.all([
                productService.getProductionLines(pageCompanyId || undefined),
                productService.getProducts(pageCompanyId || undefined)
            ]);
            setProductionLines(linesData);
            setProducts(productsData);
            // Expand all lines by default
            setExpandedLines(new Set(linesData.map(l => l.id)));

            // Load SOP documents for company
            try {
                let docQuery = supabase
                    .from('documents')
                    .select('id, title, title_ar, document_number, status')
                    .eq('type', 'sop')
                    .order('updated_at', { ascending: false });

                if (pageCompanyId) {
                    docQuery = docQuery.eq('company_id', pageCompanyId);
                }

                const { data: sopDocs } = await docQuery;
                setSopDocuments(sopDocs || []);
            } catch (docError) {
                console.error('Error loading SOP documents:', docError);
                setSopDocuments([]);
            }

            // Fetch calculated allergens for all products
            if (productsData.length > 0) {
                const productIds = productsData.map(p => p.id);
                const allergensMap = await productService.getProductsAllergens(productIds);
                setProductsAllergens(allergensMap);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleLine = (lineId: string) => {
        const newExpanded = new Set(expandedLines);
        if (newExpanded.has(lineId)) {
            newExpanded.delete(lineId);
        } else {
            newExpanded.add(lineId);
        }
        setExpandedLines(newExpanded);
    };

    const getProductsForLine = (lineId: string) => {
        return products.filter(p => p.production_line_id === lineId);
    };

    // Line CRUD
    const handleAddLine = () => {
        if (!pageCompanyId) {
            window.alert('اختر شركة أولاً لإضافة خط إنتاج.');
            return;
        }
        setEditingLine(null);
        setLineForm({ name: '', code: '', description: '' });
        setShowLineModal(true);
    };

    const handleEditLine = (line: ProductionLine) => {
        setEditingLine(line);
        setLineForm({
            name: line.name,
            code: line.code,
            description: line.description || ''
        });
        setShowLineModal(true);
    };

    const handleSaveLine = async () => {
        if (!lineForm.name || !lineForm.code) return;
        if (!pageCompanyId) {
            window.alert('اختر شركة أولاً.');
            return;
        }

        if (editingLine) {
            await productService.updateProductionLine(editingLine.id, lineForm);
        } else {
            await productService.createProductionLine({
                ...lineForm,
                company_id: pageCompanyId,
                is_active: true
            });
        }
        setShowLineModal(false);
        loadData();
    };

    const handleDeleteLine = async (id: string) => {
        if (!window.confirm('هل تريد حذف هذا الخط؟ سيتم حذف جميع المنتجات المرتبطة.')) return;
        await productService.deleteProductionLine(id);
        loadData();
    };

    // Product CRUD
    const handleAddProduct = (lineId: string) => {
        setEditingProduct(null);
        setSelectedLineId(lineId);
        setProductForm({
            name: '',
            sku: '',
            barcode: '',
            category: 'other',
            unit: 'قطعة',
            shelf_life_days: 0,
            storage_conditions: '',
            allergens: [],
            sop_document_id: null
        });
        setShowProductModal(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setSelectedLineId(product.production_line_id);
        setProductForm({
            name: product.name,
            sku: product.sku,
            barcode: product.barcode || '',
            category: product.category,
            unit: product.unit,
            shelf_life_days: product.shelf_life_days || 0,
            storage_conditions: product.storage_conditions || '',
            allergens: product.allergens || [],
            sop_document_id: product.sop_document_id || null
        });
        setShowProductModal(true);
    };

    const handleSaveProduct = async () => {
        if (!productForm.name || !productForm.sku) return;

        if (editingProduct) {
            await productService.updateProduct(editingProduct.id, {
                ...productForm,
                sop_document_id: productForm.sop_document_id || null
            });
        } else {
            const lineCompanyId = productionLines.find(l => l.id === selectedLineId)?.company_id || '';
            const companyIdForNewProduct = pageCompanyId || lineCompanyId;
            if (!companyIdForNewProduct) {
                window.alert('اختر شركة/خط إنتاج صحيح أولاً.');
                return;
            }
            await productService.createProduct({
                ...productForm,
                sop_document_id: productForm.sop_document_id || null,
                company_id: companyIdForNewProduct,
                production_line_id: selectedLineId,
                is_active: true
            });
        }
        setShowProductModal(false);
        loadData();
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm('هل تريد حذف هذا المنتج؟')) return;
        await productService.deleteProduct(id);
        loadData();
    };

    const handleToggleProductActive = async (product: Product) => {
        await productService.updateProduct(product.id, { is_active: !product.is_active });
        loadData();
    };

    const toggleAllergen = (allergen: string) => {
        setProductForm(prev => ({
            ...prev,
            allergens: prev.allergens.includes(allergen)
                ? prev.allergens.filter(a => a !== allergen)
                : [...prev.allergens, allergen]
        }));
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <TableSkeleton rows={8} />
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-auto" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CubeIcon className="w-8 h-8 text-primary-600" />
                        إدارة المنتجات وخطوط الإنتاج
                    </h1>
                    <p className="text-gray-500 mt-1">إدارة خطوط الإنتاج والمنتجات لكل شركة</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Company Selector */}
                    <select
                        value={pageCompanyId}
                        onChange={(e) => {
                            setPageCompanyId(e.target.value);
                        }}
                        className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">كل الشركات</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleAddLine}
                        disabled={!pageCompanyId}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <PlusIcon className="w-5 h-5" />
                        إضافة خط إنتاج
                    </button>
                </div>
            </div>

            {/* Production Lines Tree */}
            <div className="space-y-4">
                {productionLines.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                        <CubeIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد خطوط إنتاج</h3>
                        <p className="text-gray-500 mb-4">ابدأ بإضافة خط إنتاج ثم أضف المنتجات</p>
                        <button
                            onClick={handleAddLine}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            <PlusIcon className="w-5 h-5" />
                            إضافة خط إنتاج
                        </button>
                    </div>
                ) : (
                    productionLines.map(line => (
                        <div key={line.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Line Header */}
                            <div
                                className="flex items-center justify-between p-4 bg-gradient-to-l from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 cursor-pointer"
                                onClick={() => toggleLine(line.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {expandedLines.has(line.id) ? (
                                        <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                                    )}
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <CubeIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{line.name}</h3>
                                        <p className="text-sm text-gray-500">كود: {line.code} • {getProductsForLine(line.id).length} منتج</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleAddProduct(line.id)}
                                        className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                                        title="إضافة منتج"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleEditLine(line)}
                                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                                        title="تعديل"
                                    >
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteLine(line.id)}
                                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                        title="حذف"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Products List */}
                            {expandedLines.has(line.id) && (
                                <div className="border-t border-gray-200 dark:border-gray-700">
                                    {getProductsForLine(line.id).length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">
                                            لا توجد منتجات في هذا الخط
                                            <button
                                                onClick={() => handleAddProduct(line.id)}
                                                className="mr-2 text-primary-600 hover:underline"
                                            >
                                                إضافة منتج
                                            </button>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">اسم المنتج</th>
                                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">الكود</th>
                                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">الفئة</th>
                                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">الوحدة</th>
                                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">الصلاحية</th>
                                                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">الحالة</th>
                                                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">إجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {getProductsForLine(line.id).map(product => (
                                                    <tr key={product.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!product.is_active ? 'opacity-50' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            <div className={`font-medium ${product.is_active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                {product.name}
                                                                {!product.is_active && (
                                                                    <span className="mr-2 text-xs text-red-500">(غير مفعل)</span>
                                                                )}
                                                            </div>
                                                            {(() => {
                                                                const calculatedAllergens = productsAllergens.get(product.id) || [];
                                                                return calculatedAllergens.length > 0 && (
                                                                    <div className="text-xs text-red-600 mt-1">
                                                                        ⚠️ {calculatedAllergens.slice(0, 3).join('، ')}
                                                                        {calculatedAllergens.length > 3 && ` +${calculatedAllergens.length - 3}`}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">{product.sku}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                            {PRODUCT_CATEGORIES[product.category]?.ar || product.category}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{product.unit}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                            {product.shelf_life_days ? `${product.shelf_life_days} يوم` : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => handleToggleProductActive(product)}
                                                                className={`px-2 py-1 text-xs font-medium rounded-full ${product.is_active
                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                    }`}
                                                            >
                                                                {product.is_active ? 'مفعل ✓' : 'معطل ✗'}
                                                            </button>
                                                        </td>
                                                         <td className="px-4 py-3 text-center">
                                                             <button
                                                                 onClick={() => {
                                                                     setSelectedProductForRecipes(product);
                                                                     setShowRecipeManager(true);
                                                                 }}
                                                                className="p-1 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded mr-1"
                                                                title="إدارة الوصفات"
                                                             >
                                                                 <BeakerIcon className="w-4 h-4" />
                                                             </button>
                                                             <button
                                                                onClick={() => handleEditProduct(product)}
                                                                className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded mr-1"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteProduct(product.id)}
                                                                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded mr-1"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Line Modal */}
            {showLineModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">
                            {editingLine ? 'تعديل خط الإنتاج' : 'إضافة خط إنتاج جديد'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">اسم الخط *</label>
                                <input
                                    type="text"
                                    value={lineForm.name}
                                    onChange={e => setLineForm({ ...lineForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="مثال: خط البسكويت"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">كود الخط *</label>
                                <input
                                    type="text"
                                    value={lineForm.code}
                                    onChange={e => setLineForm({ ...lineForm, code: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="مثال: LINE-01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">الوصف</label>
                                <textarea
                                    value={lineForm.description}
                                    onChange={e => setLineForm({ ...lineForm, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSaveLine}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                <CheckIcon className="w-5 h-5" />
                                حفظ
                            </button>
                            <button
                                onClick={() => setShowLineModal(false)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                <XMarkIcon className="w-5 h-5" />
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Modal */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4">
                        <h3 className="text-lg font-bold mb-4">
                            {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">اسم المنتج *</label>
                                <input
                                    type="text"
                                    value={productForm.name}
                                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="مثال: بسكويت شوكولاتة"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">كود المنتج (SKU) *</label>
                                <input
                                    type="text"
                                    value={productForm.sku}
                                    onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="مثال: BSC-CHO-001"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">الباركود</label>
                                <input
                                    type="text"
                                    value={productForm.barcode}
                                    onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">الفئة</label>
                                <select
                                    value={productForm.category}
                                    onChange={e => setProductForm({ ...productForm, category: e.target.value as ProductCategory })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    {Object.entries(PRODUCT_CATEGORIES).map(([key, val]) => (
                                        <option key={key} value={key}>{val.ar}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">الوحدة</label>
                                <select
                                    value={productForm.unit}
                                    onChange={e => setProductForm({ ...productForm, unit: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="قطعة">قطعة</option>
                                    <option value="كجم">كجم</option>
                                    <option value="جرام">جرام</option>
                                    <option value="لتر">لتر</option>
                                    <option value="مل">مل</option>
                                    <option value="كرتونة">كرتونة</option>
                                    <option value="باكت">باكت</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">مدة الصلاحية (أيام)</label>
                                <input
                                    type="number"
                                    value={productForm.shelf_life_days}
                                    onChange={e => setProductForm({ ...productForm, shelf_life_days: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">SOP الخاص بالمنتج</label>
                                <select
                                    value={productForm.sop_document_id ?? ''}
                                    onChange={(e) => setProductForm({
                                        ...productForm,
                                        sop_document_id: e.target.value || null
                                    })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">بدون SOP</option>
                                    {sopDocuments.map(doc => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.title_ar || doc.title} ({doc.document_number})
                                        </option>
                                    ))}
                                </select>
                                {sopDocuments.length === 0 && (
                                    <p className="text-xs text-gray-500 mt-1">لا توجد وثائق SOP متاحة</p>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">شروط التخزين</label>
                                <input
                                    type="text"
                                    value={productForm.storage_conditions}
                                    onChange={e => setProductForm({ ...productForm, storage_conditions: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="مثال: يُحفظ في مكان بارد وجاف"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">مسببات الحساسية <span className="text-xs text-gray-500">(محسوبة تلقائياً من الوصفة)</span></label>
                                {editingProduct ? (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                        {(() => {
                                            const calculatedAllergens = productsAllergens.get(editingProduct.id) || [];
                                            if (calculatedAllergens.length === 0) {
                                                return <span className="text-gray-500 text-sm">لا توجد مسببات حساسية (أضف خامات للوصفة أولاً)</span>;
                                            }
                                            return (
                                                <div className="flex flex-wrap gap-2">
                                                    {calculatedAllergens.map(allergen => (
                                                        <span
                                                            key={allergen}
                                                            className="px-3 py-1 text-sm rounded-full bg-red-100 border border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400"
                                                        >
                                                            ⚠️ {allergen}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <span className="text-gray-500 text-sm">ستُحسب مسببات الحساسية بعد إضافة الوصفة</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSaveProduct}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                <CheckIcon className="w-5 h-5" />
                                حفظ
                            </button>
                            <button
                                onClick={() => setShowProductModal(false)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                <XMarkIcon className="w-5 h-5" />
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recipe Manager Modal */}
            {showRecipeManager && selectedProductForRecipes && (
                <RecipeManager
                    productId={selectedProductForRecipes.id}
                    productName={selectedProductForRecipes.name}
                    companyId={selectedProductForRecipes.company_id}
                    userRole="admin"
                    availableProducts={products}
                    onClose={() => {
                        setShowRecipeManager(false);
                        setSelectedProductForRecipes(null);
                    }}
                />
            )}
        </div>
    );
};

export default ProductsPage;
