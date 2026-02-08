/**
 * Lab Settings Page - Test Configuration Dashboard
 * صفحة إعدادات المعمل - لوحة تكوين الفحوصات
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Settings,
    Beaker,
    TestTube2,
    FlaskConical,
    FileCheck,
    Clock,
    ArrowRight
} from 'lucide-react';

// Sub-components
import TestCategoryManager from '../../components/lab/TestCategoryManager';
import TestTypeManager from '../../components/lab/TestTypeManager';
import TestConfigList from '../../components/lab/TestConfigList';
import TestTemplateManager from '../../components/lab/TestTemplateManager';
import TestScheduleManager from '../../components/lab/TestScheduleManager';
import EquipmentManager from '../../components/lab/EquipmentManager';

type TabType = 'categories' | 'types' | 'configs' | 'templates' | 'schedules' | 'equipment';

const isValidTab = (value: string | null): value is TabType =>
    value === 'configs' ||
    value === 'categories' ||
    value === 'types' ||
    value === 'templates' ||
    value === 'schedules' ||
    value === 'equipment';

const LabSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        const initialTab = searchParams.get('tab');
        return isValidTab(initialTab) ? initialTab : 'configs';
    });

    const tabs = [
        {
            id: 'configs' as TabType,
            label: 'Test Configurations',
            label_ar: 'تكوينات الفحوصات',
            icon: FlaskConical,
            color: 'text-purple-600'
        },
        {
            id: 'categories' as TabType,
            label: 'Categories',
            label_ar: 'الفئات',
            icon: Beaker,
            color: 'text-blue-600'
        },
        {
            id: 'types' as TabType,
            label: 'Test Types',
            label_ar: 'الأنواع',
            icon: TestTube2,
            color: 'text-green-600'
        },
        {
            id: 'templates' as TabType,
            label: 'Templates',
            label_ar: 'القوالب',
            icon: FileCheck,
            color: 'text-orange-600'
        },
        {
            id: 'schedules' as TabType,
            label: 'Schedules',
            label_ar: 'الجداول',
            icon: Clock,
            color: 'text-blue-600'
        },
        {
            id: 'equipment' as TabType,
            label: 'Equipment',
            label_ar: 'الأجهزة',
            icon: Settings,
            color: 'text-indigo-600'
        }
    ];

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (isValidTab(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 mb-4"
                    >
                        <ArrowRight className="w-5 h-5" />
                        <span>رجوع</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Settings className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Lab Test Configuration
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                إعدادات وتكوين فحوصات المعمل
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex gap-2 -mb-px" dir="ltr">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm
                                        transition-colors
                                        ${isActive
                                            ? 'border-purple-500 text-purple-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }
                                    `}
                                >
                                    <Icon className={`h-5 w-5 ${isActive ? tab.color : 'text-gray-400'}`} />
                                    <span>{tab.label}</span>
                                    <span className="text-xs text-gray-400">({tab.label_ar})</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {activeTab === 'categories' && <TestCategoryManager />}
                    {activeTab === 'types' && <TestTypeManager />}
                    {activeTab === 'configs' && <TestConfigList />}
                    {activeTab === 'templates' && <TestTemplateManager />}
                    {activeTab === 'schedules' && <TestScheduleManager />}
                    {activeTab === 'equipment' && <EquipmentManager />}
                </div>
            </div>
        </div>
    );
};

export default LabSettingsPage;
