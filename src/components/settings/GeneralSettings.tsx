/**
 * General Settings Component
 * مكون الإعدادات العامة - مع الحفظ في قاعدة البيانات
 */

import React, { useRef, useState, useEffect } from 'react';
import {
    Cog6ToothIcon,
    GlobeAltIcon,
    ClockIcon,
    CheckIcon,
    PhotoIcon,
    TrashIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { SettingsSkeleton, InlineLoading } from '../common/LoadingStates';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { supabase } from '../../config/supabase';

const GeneralSettingsComponent: React.FC = () => {
    // Get settings from store
    const {
        logoUrl,
        logoScale,
        language,
        timezone,
        dateFormat,
        theme,
        holdsDisposalPolicy,
        setLogoUrl,
        setLogoScale,
        resetLogo,
        setLanguage,
        setTimezone,
        setDateFormat,
        setTheme,
        setHoldsDisposalPolicy
    } = useAppSettingsStore();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [docCode, setDocCode] = useState('-01FRM-NCR');
    const [issueNo, setIssueNo] = useState('1');
    const [revisionNo, setRevisionNo] = useState('0');
    const [issueDate, setIssueDate] = useState('2026-01-01');
    const [reviewDate, setReviewDate] = useState('2026-12-31');

    // Load settings from database on mount
    useEffect(() => {
        loadSettingsFromDB();
    }, []);

    const loadSettingsFromDB = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('id, language, timezone, date_format, theme, holds_disposal_policy, logo_url, logo_scale, ncr_document_meta, updated_at')
                .eq('id', 'global')
                .single();

            if (data && !error) {
                // Update store with database values
                if (data.language) setLanguage(data.language);
                if (data.timezone) setTimezone(data.timezone);
                if (data.date_format) setDateFormat(data.date_format);
                if (data.theme) setTheme(data.theme);
                if (data.holds_disposal_policy) setHoldsDisposalPolicy(data.holds_disposal_policy);
                if (data.logo_url) setLogoUrl(data.logo_url);
                if (data.logo_scale) setLogoScale(data.logo_scale);
                if (data.ncr_document_meta) {
                    setDocCode(data.ncr_document_meta.docCode ?? '-01FRM-NCR');
                    setIssueNo(data.ncr_document_meta.issueNo ?? '1');
                    setRevisionNo(data.ncr_document_meta.revisionNo ?? '0');
                    setIssueDate(data.ncr_document_meta.issueDate ?? '2026-01-01');
                    setReviewDate(data.ncr_document_meta.reviewDate ?? '2026-12-31');
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettingsToDB = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    id: 'global',
                    language,
                    timezone,
                    date_format: dateFormat,
                    theme,
                    holds_disposal_policy: holdsDisposalPolicy,
                    logo_url: logoUrl,
                    logo_scale: logoScale,
                    ncr_document_meta: {
                        docCode,
                        issueNo,
                        revisionNo,
                        issueDate,
                        reviewDate
                    },
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('حدث خطأ أثناء حفظ الإعدادات');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
                return;
            }

            // Check file type
            if (!file.type.startsWith('image/')) {
                alert('يرجى اختيار ملف صورة');
                return;
            }

            // Convert to base64 for local storage
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                setLogoUrl(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8">
                <SettingsSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Cog6ToothIcon className="w-6 h-6 text-primary-600" />
                    الإعدادات العامة
                </h2>
                <button
                    onClick={saveSettingsToDB}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${saved
                        ? 'bg-green-600 text-white'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                        } disabled:opacity-50`}
                >
                    {saved ? (
                        <>
                            <CheckIcon className="w-5 h-5" />
                            تم الحفظ
                        </>
                    ) : isSaving ? (
                        <InlineLoading text="جاري الحفظ..." className="text-white" />
                    ) : (
                        <>
                            <CheckIcon className="w-5 h-5" />
                            حفظ الإعدادات
                        </>
                    )}
                </button>
            </div>

            {/* Logo Settings */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <PhotoIcon className="w-5 h-5 text-green-600" />
                    شعار التطبيق
                </h3>
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Logo Preview */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-48 h-24 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                            <img
                                src={logoUrl}
                                alt="Logo Preview"
                                className="max-h-full max-w-full object-contain"
                                style={{ transform: `scale(${logoScale})` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500">معاينة الشعار</p>
                    </div>

                    {/* Logo Controls */}
                    <div className="flex-1 space-y-4">
                        {/* Upload Button */}
                        <div>
                            <label className="block text-sm font-medium mb-2">رفع شعار جديد</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <PhotoIcon className="w-5 h-5" />
                                    اختيار صورة
                                </button>
                                {logoUrl !== '/Logo.png' && (
                                    <button
                                        onClick={resetLogo}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                        استعادة الافتراضي
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">PNG أو JPG (الحد الأقصى 5 ميجابايت)</p>
                        </div>

                        {/* Scale Slider */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                حجم الشعار: {Math.round(logoScale * 100)}%
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={logoScale}
                                onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>50%</span>
                                <span>100%</span>
                                <span>150%</span>
                                <span>200%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NCR Document Meta */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">تكويد تقرير NCR</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">رمز الوثيقة</label>
                        <input
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={docCode}
                            onChange={(e) => setDocCode(e.target.value)}
                            placeholder="-01FRM-NCR"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">رقم الإصدار</label>
                        <input
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={issueNo}
                            onChange={(e) => setIssueNo(e.target.value)}
                            placeholder="1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">رقم المراجعة</label>
                        <input
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={revisionNo}
                            onChange={(e) => setRevisionNo(e.target.value)}
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
                            value={issueDate}
                            onChange={(e) => setIssueDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">تاريخ المراجعة</label>
                        <input
                            type="date"
                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900/50"
                            value={reviewDate}
                            onChange={(e) => setReviewDate(e.target.value)}
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">تظهر هذه البيانات في ترويسة تقرير الطباعة الخاص بـ NCR.</p>
            </div>

            {/* Language & Region */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <GlobeAltIcon className="w-5 h-5 text-blue-600" />
                    اللغة والمنطقة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">اللغة</label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as 'ar' | 'en')}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="ar">العربية</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">المنطقة الزمنية</label>
                        <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                            <option value="Asia/Dubai">دبي (GMT+4)</option>
                            <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                            <option value="Asia/Amman">عمّان (GMT+3)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">تنسيق التاريخ</label>
                        <select
                            value={dateFormat}
                            onChange={(e) => setDateFormat(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Policy Settings */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <ClockIcon className="w-5 h-5 text-orange-600" />
                    سياسات النظام
                </h3>
                <div>
                    <label className="block text-sm font-medium mb-2">سياسة الاحتجاز والتخلص</label>
                    <select
                        value={holdsDisposalPolicy}
                        onChange={(e) => setHoldsDisposalPolicy(e.target.value as 'warning' | 'strict' | 'flexible')}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="warning">تحذير (تذكير قبل انتهاء الفترة)</option>
                        <option value="strict">صارم (منع العمليات بعد انتهاء الفترة)</option>
                        <option value="flexible">مرن (سماح مع تنبيه)</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettingsComponent;
