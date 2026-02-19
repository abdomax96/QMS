import React from 'react';
import { Link } from 'react-router-dom';
import {
  BeakerIcon,
  WrenchScrewdriverIcon,
  CircleStackIcon,
  ClipboardDocumentCheckIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const LabV2DashboardPage: React.FC = () => {
  const sections = [
    {
      title: 'إدارة الأجهزة',
      description: 'تسجيل الأجهزة والمعايرات والتنبيهات',
      icon: WrenchScrewdriverIcon,
      path: '/lab/tests/devices',
      gradient: 'from-sky-500 to-sky-600',
      iconBg: 'bg-sky-100 dark:bg-sky-900/30',
      iconColor: 'text-sky-600',
    },
    {
      title: 'إدارة المواد (Chemicals)',
      description: 'تسجيل المواد والاستلامات والمخزون',
      icon: CircleStackIcon,
      path: '/lab/tests/chemicals',
      gradient: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'كتالوج الفحوصات',
      description: 'تعريف الفحوصات والمعاملات وقواعد القبول',
      icon: BeakerIcon,
      path: '/lab/tests/catalog',
      gradient: 'from-indigo-500 to-indigo-600',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'سجل الفحوصات',
      description: 'تشغيل الفحوصات على الباتشات واعتماد النتائج',
      icon: ClipboardDocumentCheckIcon,
      path: '/lab/tests/runs',
      gradient: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600',
    },
    {
      title: 'التقارير',
      description: 'إحصائيات وفلترة النتائج (قريباً)',
      icon: DocumentChartBarIcon,
      path: '/lab/tests/reports',
      gradient: 'from-rose-500 to-rose-600',
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconColor: 'text-rose-600',
    },
    {
      title: 'الإعدادات',
      description: 'إعدادات الموديول (قريباً)',
      icon: Cog6ToothIcon,
      path: '/lab/tests/settings',
      gradient: 'from-slate-600 to-slate-700',
      iconBg: 'bg-slate-100 dark:bg-slate-900/30',
      iconColor: 'text-slate-700 dark:text-slate-300',
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" dir="rtl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
          <BeakerIcon className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">نظام إدارة المختبر (V2)</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">إدارة الأجهزة والمواد وتعريف الفحوصات وتشغيلها مع Workflow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {sections.map((section) => (
          <Link
            key={section.path}
            to={section.path}
            className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

            <div className="relative">
              <div className={`inline-flex items-center justify-center w-16 h-16 ${section.iconBg} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <section.icon className={`w-8 h-8 ${section.iconColor}`} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {section.title}
              </h3>

              <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm leading-relaxed">{section.description}</p>

              <div className="flex items-center justify-between text-primary-600 dark:text-primary-400 font-medium transition-all">
                <span className="text-sm">الانتقال</span>
                <ArrowRightIcon className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>

            <div className={`absolute top-0 left-0 w-20 h-20 bg-gradient-to-br ${section.gradient} opacity-10 rounded-br-full`} />
          </Link>
        ))}
      </div>


    </div>
  );
};

export default LabV2DashboardPage;
