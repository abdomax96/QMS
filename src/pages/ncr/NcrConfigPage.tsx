import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useDefects } from '../../hooks/ncr/useDefects';
import type { DefectType } from '../../hooks/ncr/useDefects';
import { useNcrSettings } from '../../hooks/ncr/useNcrSettings';

const DEFECT_TYPE_LABELS: Record<DefectType, string> = {
    raw_material: 'خامة مستلمة',
    product: 'منتج',
    process: 'عملية / خط',
    other: 'أخرى'
};

const SEVERITY_LABELS: Record<'low' | 'medium' | 'high', string> = {
    low: 'منخفض',
    medium: 'متوسط',
    high: 'مرتفع'
};

export default function NcrConfigPage() {
    const { defects, addDefect, updateDefect, loading, error } = useDefects({ includeInactive: true });
    const { settings, updateSettings, isLoading: settingsLoading } = useNcrSettings();
    const [form, setForm] = useState<{ name: string; severity: 'low' | 'medium' | 'high'; type: DefectType }>({
        name: '',
        severity: 'medium',
        type: 'product'
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [metaSaving, setMetaSaving] = useState(false);
    const [metaSaved, setMetaSaved] = useState(false);
    const [meta, setMeta] = useState({
        docCode: '-01FRM-NCR',
        issueNo: '1',
        revisionNo: '0',
        issueDate: '2026-01-01',
        reviewDate: '2026-12-31'
    });

    useEffect(() => {
        if (settings?.ncrDocumentMeta) {
            setMeta({
                docCode: settings.ncrDocumentMeta.docCode ?? '-01FRM-NCR',
                issueNo: settings.ncrDocumentMeta.issueNo ?? '1',
                revisionNo: settings.ncrDocumentMeta.revisionNo ?? '0',
                issueDate: settings.ncrDocumentMeta.issueDate ?? '2026-01-01',
                reviewDate: settings.ncrDocumentMeta.reviewDate ?? '2026-12-31'
            });
        }
    }, [settings]);

    const handleAdd = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        setMessage(null);
        try {
            await addDefect({ name: form.name.trim(), severity: form.severity, defect_type: form.type });
            setForm({ ...form, name: '' });
            setMessage('تمت إضافة العيب');
        } catch (e: any) {
            setMessage(e.message || 'تعذر الإضافة');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إعدادات NCR</h1>
                    <p className="text-gray-500 mt-1">إدارة العيوب ومستويات الخطورة وإعدادات الإضافة والطباعة</p>
                </div>
                <Link
                    to="/ncr"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    العودة للرئيسية
                </Link>
            </div>

            {/* NCR Print Meta */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">تكويد التقرير (الترويسة)</h2>
                    <div className="text-sm text-gray-500 flex items-center gap-3">
                        {settingsLoading && <span>جار التحميل...</span>}
                        {metaSaved && <span className="text-emerald-600">تم الحفظ</span>}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">رمز الوثيقة</label>
                        <input
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={meta.docCode}
                            onChange={(e) => setMeta({ ...meta, docCode: e.target.value })}
                            placeholder="-01FRM-NCR"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">رقم الإصدار</label>
                        <input
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={meta.issueNo}
                            onChange={(e) => setMeta({ ...meta, issueNo: e.target.value })}
                            placeholder="1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">رقم المراجعة</label>
                        <input
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={meta.revisionNo}
                            onChange={(e) => setMeta({ ...meta, revisionNo: e.target.value })}
                            placeholder="0"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">تاريخ الإصدار</label>
                        <input
                            type="date"
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={meta.issueDate}
                            onChange={(e) => setMeta({ ...meta, issueDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">تاريخ المراجعة</label>
                        <input
                            type="date"
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={meta.reviewDate}
                            onChange={(e) => setMeta({ ...meta, reviewDate: e.target.value })}
                        />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={async () => {
                        setMetaSaving(true);
                        setMetaSaved(false);
                        try {
                            await updateSettings({ ncrDocumentMeta: meta });
                            setMetaSaved(true);
                            setTimeout(() => setMetaSaved(false), 1500);
                        } finally {
                            setMetaSaving(false);
                        }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    disabled={settingsLoading || metaSaving}
                >
                    {metaSaving ? 'جار الحفظ...' : 'حفظ التكويد'}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">تظهر هذه البيانات في ترويسة تقرير الطباعة لـ NCR.</p>
            </div>

            {/* إضافة عيب */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">إضافة عيب جديد</h2>
                    {message && <span className="text-sm text-emerald-600 dark:text-emerald-400">{message}</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">اسم العيب</label>
                        <input
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="مثال: خدش السطح"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">النوع</label>
                        <select
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value as DefectType })}
                        >
                            {Object.entries(DEFECT_TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">مستوى الخطورة</label>
                        <select
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={form.severity}
                            onChange={(e) => setForm({ ...form, severity: e.target.value as any })}
                        >
                            <option value="low">منخفض</option>
                            <option value="medium">متوسط</option>
                            <option value="high">مرتفع</option>
                        </select>
                    </div>
                </div>
                <button
                    type="button"
                    disabled={saving}
                    onClick={handleAdd}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                    <PlusIcon className="w-5 h-5" />
                    إضافة
                </button>
            </div>

            {/* قائمة العيوب */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">قائمة العيوب</h2>
                    {loading && <span className="text-sm text-gray-500">جار التحميل...</span>}
                    {error && <span className="text-sm text-rose-500">{error}</span>}
                </div>
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                            <tr>
                                <th className="px-3 py-2 text-right">العيب</th>
                                <th className="px-3 py-2 text-right">النوع</th>
                                <th className="px-3 py-2 text-right">الخطورة</th>
                                <th className="px-3 py-2 text-right">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {defects.map((d) => (
                                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{d.name}</td>
                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{DEFECT_TYPE_LABELS[d.defect_type]}</td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            d.severity === 'high' ? 'bg-rose-100 text-rose-700' :
                                            d.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {SEVERITY_LABELS[d.severity]}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={d.is_active}
                                                onChange={() => updateDefect(d.id, { is_active: !d.is_active })}
                                            />
                                            {d.is_active ? 'مفعل' : 'معطل'}
                                        </label>
                                    </td>
                                </tr>
                            ))}
                            {defects.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">لا توجد عيوب مسجلة</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
