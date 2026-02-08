import React from 'react';
import { Link } from 'react-router-dom';
import {
    BeakerIcon,
    Cog6ToothIcon,
    ChartBarIcon,
    PresentationChartLineIcon,
    ClipboardDocumentListIcon,
    PlusCircleIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

const LabTestsDashboard: React.FC = () => {
    const sections = [
        {
            title: 'نتائج الفحوصات',
            description: 'عرض وإدارة نتائج جميع الفحوصات المخبرية',
            icon: ChartBarIcon,
            path: '/lab/tests/results',
            gradient: 'from-blue-500 to-blue-600',
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600'
        },
        {
            title: 'إدخال سريع',
            description: 'إدخال فحص جديد بشكل سريع ومباشر',
            icon: ClipboardDocumentListIcon,
            path: '/lab/quick-entry',
            gradient: 'from-green-500 to-green-600',
            iconBg: 'bg-green-100 dark:bg-green-900/30',
            iconColor: 'text-green-600'
        },
        {
            title: 'التحليلات',
            description: 'تحليلات وإحصائيات شاملة للفحوصات',
            icon: PresentationChartLineIcon,
            path: '/lab/analytics',
            gradient: 'from-purple-500 to-purple-600',
            iconBg: 'bg-purple-100 dark:bg-purple-900/30',
            iconColor: 'text-purple-600'
        },
        {
            title: 'إعدادات المعمل',
            description: 'إدارة فئات وأنواع الفحوصات والإعدادات',
            icon: Cog6ToothIcon,
            path: '/lab/tests/v1/settings',
            gradient: 'from-orange-500 to-orange-600',
            iconBg: 'bg-orange-100 dark:bg-orange-900/30',
            iconColor: 'text-orange-600'
        },
        {
            title: 'تكوين جديد',
            description: 'إنشاء تكوين فحص جديد',
            icon: PlusCircleIcon,
            path: '/lab/config/new',
            gradient: 'from-indigo-500 to-indigo-600',
            iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
            iconColor: 'text-indigo-600'
        }
    ];

    return (
        <div className="p-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl shadow-lg mb-4">
                    <BeakerIcon className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                    نظام الفحوصات المخبرية
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                    نظام متكامل لإدارة وتتبع الفحوصات المخبرية
                </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {sections.map((section) => (
                    <Link
                        key={section.path}
                        to={section.path}
                        className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                    >
                        {/* Gradient Background on Hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                        {/* Content */}
                        <div className="relative">
                            {/* Icon */}
                            <div className={`inline-flex items-center justify-center w-16 h-16 ${section.iconBg} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                <section.icon className={`w-8 h-8 ${section.iconColor}`} />
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {section.title}
                            </h3>

                            {/* Description */}
                            <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm leading-relaxed">
                                {section.description}
                            </p>

                            {/* Arrow Icon */}
                            <div className="flex items-center text-primary-600 dark:text-primary-400 font-medium group-hover:gap-2 transition-all">
                                <span className="text-sm">الانتقال</span>
                                <ArrowRightIcon className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                            </div>
                        </div>

                        {/* Decorative Corner */}
                        <div className={`absolute top-0 left-0 w-20 h-20 bg-gradient-to-br ${section.gradient} opacity-10 rounded-br-full`} />
                    </Link>
                ))}
            </div>

            {/* Quick Stats (Optional) */}
            <div className="mt-12 max-w-4xl mx-auto">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <ChartBarIcon className="w-6 h-6 text-primary-600" />
                        نظرة سريعة
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                            <div className="text-2xl font-bold text-blue-600 mb-1">5</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">الأقسام المتاحة</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                            <div className="text-2xl font-bold text-green-600 mb-1">✓</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">نظام متكامل</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                            <div className="text-2xl font-bold text-purple-600 mb-1">∞</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">فحوصات غير محدودة</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                            <div className="text-2xl font-bold text-orange-600 mb-1">⚡</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">أداء سريع</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LabTestsDashboard;
