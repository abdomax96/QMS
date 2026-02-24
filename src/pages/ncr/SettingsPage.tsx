/**
 * Settings Page
 * صفحة الإعدادات
 */

import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Cog6ToothIcon,
    BuildingOfficeIcon,
    BellIcon,
    CubeIcon,
    ClipboardDocumentCheckIcon,
    KeyIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { SettingsSkeleton } from '../../components/common/LoadingStates';

// Lazy load pages
const CompaniesPage = lazy(() => import('../lab/CompaniesPage'));
const ProductsPage = lazy(() => import('../settings/ProductsPage'));
const AuditLogPage = lazy(() => import('../admin/AuditLogPage'));
const GeneralSettings = lazy(() => import('../../components/settings/GeneralSettings'));
const AccessManagement = lazy(() => import('../../components/settings/AccessManagement'));
const NotificationSettings = lazy(() => import('../../components/settings/NotificationSettings'));

type TabType = 'general' | 'access' | 'companies' | 'products' | 'notifications' | 'audit';

const validSections: TabType[] = ['general', 'access', 'companies', 'products', 'notifications', 'audit'];

const SettingsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Get initial section from URL or default to 'general'
    const getInitialSection = useCallback((): TabType => {
        const sectionFromUrl = searchParams.get('section') as TabType | null;
        return sectionFromUrl && validSections.includes(sectionFromUrl) ? sectionFromUrl : 'general';
    }, []);

    const [activeTab, setActiveTab] = useState<TabType>(getInitialSection);

    // Update URL when section changes (preserve existing tab param)
    const handleSectionChange = useCallback((sectionId: TabType) => {
        setActiveTab(sectionId);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('section', sectionId);
        // Clear tab param when switching sections (except for 'access' which has child tabs)
        if (sectionId !== 'access') {
            newParams.delete('tab');
        }
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    // Sync state with URL on page load and navigation
    useEffect(() => {
        const sectionFromUrl = searchParams.get('section') as TabType | null;
        if (sectionFromUrl && validSections.includes(sectionFromUrl) && sectionFromUrl !== activeTab) {
            setActiveTab(sectionFromUrl);
        }
    }, [searchParams]);

    const tabs = [
        { id: 'general' as TabType, name: 'عام', icon: Cog6ToothIcon },
        { id: 'access' as TabType, name: 'إدارة الوصول', icon: KeyIcon },
        { id: 'companies' as TabType, name: 'الشركات والعملاء', icon: BuildingOfficeIcon },
        { id: 'products' as TabType, name: 'المنتجات وخطوط الإنتاج', icon: CubeIcon },
        { id: 'audit' as TabType, name: 'سجل التدقيق', icon: ClipboardDocumentCheckIcon },
        { id: 'notifications' as TabType, name: 'الإشعارات', icon: BellIcon },
    ];

    // Full-height tabs
    const isFullHeightTab = ['access', 'companies', 'products', 'audit'].includes(activeTab);


    return (
        <div className={`${isFullHeightTab ? 'h-full flex flex-col' : ''} p-3 sm:p-4 lg:p-6`} dir="rtl">
            {/* Header */}
            <div className="mb-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Cog6ToothIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
                        الإعدادات
                    </h1>
                    <p className="text-sm sm:text-base text-gray-500 mt-1">إدارة إعدادات النظام</p>
                </div>

                <button
                    onClick={() => navigate('/users')}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-700 dark:hover:bg-primary-900/50"
                >
                    <UserGroupIcon className="w-5 h-5" />
                    دليل المستخدمين
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 flex-shrink-0 overflow-x-auto pb-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleSectionChange(tab.id)}
                        className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.name}
                    </button>
                ))}
            </div>

            <div className={`${isFullHeightTab ? 'flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' : 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6'}`}>
                <Suspense fallback={<SettingsSkeleton />}>
                    {activeTab === 'general' && <GeneralSettings />}
                    {activeTab === 'access' && <AccessManagement />}
                    {activeTab === 'companies' && <CompaniesPage />}
                    {activeTab === 'products' && <ProductsPage />}
                    {activeTab === 'audit' && <AuditLogPage />}
                    {activeTab === 'notifications' && <NotificationSettings />}
                </Suspense>
            </div>
        </div>
    );
};

export default SettingsPage;
