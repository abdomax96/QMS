/**
 * Pallet Module Settings Page (V3)
 * Tabbed interface for:
 * 1. General/Company-wide settings (print, loading)
 * 2. Per-product pallet configurations with visual editor
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useCompanyStore } from '../../store/companyStore';
import {
    Settings,
    Printer,
    Package,
    Save,
    Plus,
    Edit2,
    Trash2,
    AlertCircle,
    Loader2,
    CheckCircle,
    Boxes
} from 'lucide-react';
import ProductPalletConfigForm from '../../components/pallet/config/ProductPalletConfigForm';
import { palletConfigService } from '../../services/palletConfigService';
import type {
    ProductPalletConfigWithProduct,
    ProductPalletConfigInput,
    PalletCompanySettings
} from '../../types/palletConfig';

// =====================================================
// Types
// =====================================================

type ActiveTab = 'general' | 'products';

interface ProductOption {
    id: string;
    name: string;
    sku: string;
}

// =====================================================
// Component
// =====================================================

export default function PalletSettings() {
    const { selectedCompanyId } = useCompanyStore();
    const [activeTab, setActiveTab] = useState<ActiveTab>('general');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // General settings state
    const [companySettings, setCompanySettings] = useState<Partial<PalletCompanySettings>>({
        auto_print_on_creation: false,
        default_copies: 1,
        label_template: 'default',
        show_preview_dialog: true,
        allow_multiple_batches_per_pallet: true,
        default_loading_strategy: 'fifo',
        allow_partial_pallet_loading: true,
        require_inspection_before_loading: false,
        default_cartons_per_pallet: 48
    });

    // Product configs state
    const [productConfigs, setProductConfigs] = useState<ProductPalletConfigWithProduct[]>([]);
    const [productsWithoutConfig, setProductsWithoutConfig] = useState<ProductOption[]>([]);

    // Modal state for editing product config
    const [editingProduct, setEditingProduct] = useState<{
        id: string;
        name: string;
        config?: ProductPalletConfigWithProduct;
    } | null>(null);

    // =====================================================
    // Load Data
    // =====================================================

    const loadData = useCallback(async () => {
        if (!selectedCompanyId) return;

        setLoading(true);
        try {
            // Load company settings
            const settings = await palletConfigService.getCompanySettings(selectedCompanyId);
            if (settings) {
                setCompanySettings(settings);
            }

            // Load product configs
            const configs = await palletConfigService.getConfigsByCompanyId(selectedCompanyId);
            setProductConfigs(configs);

            // Load products without config
            const unconfigured = await palletConfigService.getProductsWithoutConfig(selectedCompanyId);
            setProductsWithoutConfig(unconfigured);
        } catch (error) {
            console.error('Error loading settings:', error);
            setMessage({ type: 'error', text: 'فشل تحميل الإعدادات' });
        } finally {
            setLoading(false);
        }
    }, [selectedCompanyId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // =====================================================
    // Save Handlers
    // =====================================================

    const handleSaveGeneralSettings = async () => {
        if (!selectedCompanyId) return;

        setSaving(true);
        try {
            await palletConfigService.updateCompanySettings(selectedCompanyId, companySettings);
            setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'فشل حفظ الإعدادات' });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveProductConfig = async (config: ProductPalletConfigInput) => {
        if (!selectedCompanyId || !editingProduct) return;

        try {
            await palletConfigService.upsertConfig(
                editingProduct.id,
                selectedCompanyId,
                config
            );
            setMessage({ type: 'success', text: 'تم حفظ تخصيصات المنتج بنجاح' });
            setEditingProduct(null);
            loadData(); // Reload to reflect changes
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving product config:', error);
            throw error; // Re-throw to be handled by form
        }
    };

    const handleDeleteProductConfig = async (configId: string) => {
        if (!confirm('هل أنت متأكد من حذف تخصيصات هذا المنتج؟')) return;

        try {
            await palletConfigService.deleteConfig(configId);
            setMessage({ type: 'success', text: 'تم حذف التخصيصات' });
            loadData();
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error deleting config:', error);
            setMessage({ type: 'error', text: 'فشل حذف التخصيصات' });
        }
    };

    // =====================================================
    // Render - Loading
    // =====================================================

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-gray-500">جاري تحميل الإعدادات...</p>
                </div>
            </div>
        );
    }

    // =====================================================
    // Render - Product Config Modal
    // =====================================================

    if (editingProduct) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="mb-6">
                    <button
                        onClick={() => setEditingProduct(null)}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                        ← العودة للإعدادات
                    </button>
                </div>
                <ProductPalletConfigForm
                    productId={editingProduct.id}
                    productName={editingProduct.name}
                    initialConfig={editingProduct.config}
                    onSave={handleSaveProductConfig}
                    onCancel={() => setEditingProduct(null)}
                />
            </div>
        );
    }

    // =====================================================
    // Render - Main Settings Page
    const hasUnconfiguredProducts = productsWithoutConfig.length > 0;
    // =====================================================

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="text-gray-600" />
                        إعدادات إدارة البالتات
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        تخصيص الطباعة، قواعد التحميل، وتخصيصات المنتجات
                    </p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle size={20} />
                    ) : (
                        <AlertCircle size={20} />
                    )}
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'general'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Settings size={18} />
                            الإعدادات العامة
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'products'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Boxes size={18} />
                            تخصيصات المنتجات
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                {productConfigs.length}
                            </span>
                        </div>
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'general' && (
                <div className="space-y-6">
                    {/* Print Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <Printer className="text-blue-600" size={20} />
                            <h2 className="font-semibold text-gray-900">إعدادات الطباعة</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Auto Print Toggle */}
                                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                    <div>
                                        <label className="font-medium text-gray-900 block">الطباعة التلقائية</label>
                                        <p className="text-sm text-gray-500">طباعة الملصق عند إنشاء البالتة</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={companySettings.auto_print_on_creation || false}
                                            onChange={(e) => setCompanySettings({ ...companySettings, auto_print_on_creation: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Show Preview Toggle */}
                                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                    <div>
                                        <label className="font-medium text-gray-900 block">إظهار المعاينة</label>
                                        <p className="text-sm text-gray-500">عرض نموذج الملصق قبل الطباعة</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={companySettings.show_preview_dialog || false}
                                            onChange={(e) => setCompanySettings({ ...companySettings, show_preview_dialog: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Copies */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">عدد النسخ</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={companySettings.default_copies || 1}
                                        onChange={(e) => setCompanySettings({ ...companySettings, default_copies: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Template */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">قالب الملصق</label>
                                    <select
                                        value={companySettings.label_template || 'default'}
                                        onChange={(e) => setCompanySettings({ ...companySettings, label_template: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="default">الافتراضي (QR + Barcode)</option>
                                        <option value="compact">مختصر</option>
                                        <option value="detailed">تفصيلي</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Loading Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <Package className="text-green-600" size={20} />
                            <h2 className="font-semibold text-gray-900">إعدادات التحميل</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Default Cartons */}
                                {/* Loading Strategy */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">استراتيجية التحميل</label>
                                    <select
                                        value={companySettings.default_loading_strategy || 'fifo'}
                                        onChange={(e) => setCompanySettings({ ...companySettings, default_loading_strategy: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="fifo">FIFO - الأول دخولاً الأول خروجاً</option>
                                        <option value="fefo">FEFO - الأقرب انتهاءً الأول خروجاً</option>
                                        <option value="lifo">LIFO - الأخير دخولاً الأول خروجاً</option>
                                    </select>
                                </div>

                                {/* Allow Partial */}
                                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                    <div>
                                        <label className="font-medium text-gray-900 block">السماح بتحميل جزئي</label>
                                        <p className="text-sm text-gray-500">تحميل بالتات غير مكتملة</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={companySettings.allow_partial_pallet_loading || false}
                                            onChange={(e) => setCompanySettings({ ...companySettings, allow_partial_pallet_loading: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                {/* Require Inspection */}
                                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                    <div>
                                        <label className="font-medium text-gray-900 block">فحص المركبة مطلوب</label>
                                        <p className="text-sm text-gray-500">فحص المركبة قبل بدء التحميل</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={companySettings.require_inspection_before_loading || false}
                                            onChange={(e) => setCompanySettings({ ...companySettings, require_inspection_before_loading: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveGeneralSettings}
                            disabled={saving}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'products' && (
                <div className="space-y-6">
                    {/* Add Product Config Button */}
                    {productsWithoutConfig.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-blue-900">
                                        {productsWithoutConfig.length} منتج بدون تخصيصات
                                    </p>
                                    <p className="text-sm text-blue-700">
                                        اختر منتج لإضافة تخصيصات البالتة الخاصة به
                                    </p>
                                </div>
                                <select
                                    onChange={(e) => {
                                        const product = productsWithoutConfig.find(p => p.id === e.target.value);
                                        if (product) {
                                            setEditingProduct({ id: product.id, name: product.name });
                                        }
                                        e.target.value = '';
                                    }}
                                    className="px-4 py-2 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                                    defaultValue=""
                                >
                                    <option value="" disabled>+ إضافة تخصيصات منتج</option>
                                    {productsWithoutConfig.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product.sku})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Product Configs List */}
                    {productConfigs.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <Boxes size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">لا توجد تخصيصات</h3>
                            <p className="text-gray-500 mt-1">
                                أضف تخصيصات لكل منتج لتحديد طريقة رص البالتة
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">المنتج</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">أبعاد الكرتونة</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">الطبقات</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">الإجمالي</th>
                                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {productConfigs.map(config => (
                                        <tr key={config.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">
                                                    {config.product?.name || 'غير معروف'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {config.product?.sku}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {config.carton_width_cm} × {config.carton_depth_cm} × {config.carton_height_cm} سم
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {config.cartons_per_layer} × {config.number_of_layers}
                                                {config.alternate_layers && (
                                                    <span className="mr-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                                        متبادل
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-green-600">
                                                    {config.total_cartons_per_pallet}
                                                </span>
                                                <span className="text-sm text-gray-500 mr-1">كرتونة</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setEditingProduct({
                                                            id: config.product_id,
                                                            name: config.product?.name || '',
                                                            config
                                                        })}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="تعديل"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProductConfig(config.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="حذف"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
