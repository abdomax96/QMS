/**
 * FSSC 22000 Module Page
 * صفحة إعداد وثائق FSSC 22000 V6
 */

import React, { useState } from 'react';
import {
    DocumentTextIcon,
    FolderIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import useStore from '../store';
import { fsscFolders, fsscTemplates } from '../data/fssc22000-seed';
import { detailedFSSCTemplates } from '../data/fssc-detailed-templates';
import supabaseService from '../services/supabaseService';

const FSSC22000Page: React.FC = () => {
    const folders = useStore(state => state.folders);
    const addFolder = useStore(state => state.addFolder);
    const addFormTemplate = useStore(state => state.addFormTemplate);
    const [isInitializing, setIsInitializing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [syncComplete, setSyncComplete] = useState(false);
    const [progress, setProgress] = useState({ folders: 0, templates: 0 });

    // Check if FSSC data already exists (look for the FSSC 22000 V6 name)
    const fsscRootExists = Object.values(folders).some(
        f => f.name === 'FSSC 22000 V6'
    );

    const handleInitialize = async () => {
        if (fsscRootExists) {
            if (!window.confirm('بيانات FSSC 22000 موجودة بالفعل. هل تريد إعادة التهيئة؟')) {
                return;
            }
        }

        setIsInitializing(true);
        setProgress({ folders: 0, templates: 0 });

        try {
            for (let i = 0; i < fsscFolders.length; i++) {
                addFolder(fsscFolders[i]);
                setProgress(p => ({ ...p, folders: i + 1 }));
                if (i > 0 && i % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            // Add basic templates
            for (let i = 0; i < fsscTemplates.length; i++) {
                addFormTemplate(fsscTemplates[i]);
                setProgress(p => ({ ...p, templates: i + 1 }));
                if (i > 0 && i % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            // Add detailed templates with full Form Builder structure
            for (const template of detailedFSSCTemplates) {
                addFormTemplate(template);
            }

            setIsInitialized(true);
        } catch (error) {
            console.error('Error initializing FSSC data:', error);
            alert('حدث خطأ أثناء تهيئة البيانات: ' + (error as Error).message);
        } finally {
            setIsInitializing(false);
        }
    };

    // Sync existing local data to Supabase
    const handleSyncToSupabase = async () => {
        setIsSyncing(true);
        setProgress({ folders: 0, templates: 0 });
        console.log('Starting sync to Supabase...');
        console.log('Folders to sync:', fsscFolders.length);
        console.log('Templates to sync:', fsscTemplates.length);
        console.log('First folder:', fsscFolders[0]);

        try {
            // Sync all FSSC folders from seed data
            for (let i = 0; i < fsscFolders.length; i++) {
                console.log(`Syncing folder ${i + 1}/${fsscFolders.length}:`, fsscFolders[i].id, fsscFolders[i].name);
                try {
                    await supabaseService.folders.saveFolder(fsscFolders[i]);
                    console.log(`✅ Folder ${i + 1} saved successfully`);
                } catch (folderError) {
                    console.error(`❌ Error saving folder ${i + 1}:`, folderError);
                    throw folderError;
                }
                setProgress(p => ({ ...p, folders: i + 1 }));
                if (i > 0 && i % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            console.log('All folders synced! Starting templates...');

            // Sync all FSSC templates from seed data
            for (let i = 0; i < fsscTemplates.length; i++) {
                console.log(`Syncing template ${i + 1}/${fsscTemplates.length}:`, fsscTemplates[i].id, fsscTemplates[i].name);
                try {
                    await supabaseService.templates.saveTemplate(fsscTemplates[i]);
                    console.log(`✅ Template ${i + 1} saved successfully`);
                } catch (templateError) {
                    console.error(`❌ Error saving template ${i + 1}:`, templateError);
                    throw templateError;
                }
                setProgress(p => ({ ...p, templates: i + 1 }));
                if (i > 0 && i % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            setSyncComplete(true);
            console.log('🎉 All data synced successfully!');
            alert('تم مزامنة جميع البيانات مع Supabase بنجاح! ✅');
        } catch (error) {
            console.error('Error syncing to Supabase:', error);
            alert('حدث خطأ أثناء المزامنة: ' + (error as Error).message);
        } finally {
            setIsSyncing(false);
        }
    };

    const stats = {
        folders: fsscFolders.length,
        templates: fsscTemplates.length,
        policies: fsscTemplates.filter(t => t.type === 'policy').length,
        procedures: fsscTemplates.filter(t => t.type === 'procedure').length,
        forms: fsscTemplates.filter(t => t.type === 'form').length,
        checklists: fsscTemplates.filter(t => t.type === 'checklist').length,
        riskAssessments: fsscTemplates.filter(t => t.type === 'risk-assessment').length,
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                    <ShieldCheckIcon className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    FSSC 22000 V6
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                    نظام إدارة سلامة الغذاء - 260+ وثيقة جاهزة للاستخدام
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <FolderIcon className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.folders}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">مجلد</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <DocumentTextIcon className="w-8 h-8 mx-auto text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.templates}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">وثيقة</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-2xl font-bold text-purple-600">{stats.policies}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">سياسة</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.procedures}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">إجراء</p>
                </div>
            </div>

            {/* Document Types Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">توزيع الوثائق</h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">النماذج (Forms)</span>
                        <span className="font-semibold text-green-600">{stats.forms}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">الإجراءات (Procedures)</span>
                        <span className="font-semibold text-blue-600">{stats.procedures}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">قوائم التحقق (Checklists)</span>
                        <span className="font-semibold text-amber-600">{stats.checklists}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">تقييمات المخاطر</span>
                        <span className="font-semibold text-red-600">{stats.riskAssessments}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">السياسات (Policies)</span>
                        <span className="font-semibold text-purple-600">{stats.policies}</span>
                    </div>
                </div>
            </div>

            {/* Parts Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">هيكل المعيار</h2>
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">1</div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">ISO 22000:2018</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">نظام إدارة سلامة الغذاء - 8 بنود رئيسية</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold">2</div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">ISO/TS 22002-1:2009</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">برامج المتطلبات الأساسية - 15 بند</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                        <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold">3</div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">FSSC 22000 V6 الإضافية</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">متطلبات إضافية - 18 بند</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="text-center space-y-4">
                {isInitialized || fsscRootExists ? (
                    <>
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl">
                            <CheckCircleIcon className="w-6 h-6" />
                            <span className="font-semibold">تم تهيئة البيانات محلياً!</span>
                        </div>

                        {/* Sync to Supabase Button */}
                        {!syncComplete && (
                            <div>
                                <button
                                    onClick={handleSyncToSupabase}
                                    disabled={isSyncing}
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-colors disabled:opacity-50"
                                >
                                    {isSyncing ? (
                                        <>
                                            <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                            <span>
                                                جاري المزامنة مع Supabase...
                                                ({progress.folders}/{stats.folders} مجلد، {progress.templates}/{stats.templates} وثيقة)
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <CloudArrowUpIcon className="w-6 h-6" />
                                            مزامنة البيانات مع Supabase
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {syncComplete && (
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl">
                                <CloudArrowUpIcon className="w-6 h-6" />
                                <span className="font-semibold">تم المزامنة مع Supabase! ✅</span>
                            </div>
                        )}
                    </>
                ) : (
                    <button
                        onClick={handleInitialize}
                        disabled={isInitializing}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-colors disabled:opacity-50"
                    >
                        {isInitializing ? (
                            <>
                                <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                <span>
                                    جاري التهيئة...
                                    ({progress.folders}/{stats.folders} مجلد، {progress.templates}/{stats.templates} وثيقة)
                                </span>
                            </>
                        ) : (
                            <>
                                <FolderIcon className="w-6 h-6" />
                                تهيئة وثائق FSSC 22000
                            </>
                        )}
                    </button>
                )}

                {(isInitialized || fsscRootExists) && (
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                        يمكنك الآن الذهاب إلى <a href="/forms" className="text-primary-600 hover:underline font-semibold">صفحة النماذج</a> لاستعراض الوثائق
                    </p>
                )}
            </div>
        </div>
    );
};

export default FSSC22000Page;
