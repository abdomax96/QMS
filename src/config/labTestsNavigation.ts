/**
 * Lab Tests Navigation Configuration
 * إعدادات قائمة فحوصات المعمل
 * 
 * Add this to your navigation configuration (MainLayout.tsx or similar)
 */

import { FlaskConical as Flask, Zap, FileCheck, Settings, Calendar, BarChart3 } from 'lucide-react';

export const labTestsNavigation = {
    label: 'Lab Tests',
    label_ar: 'فحوصات المعمل',
    icon: Flask,
    href: '/lab-new',
    moduleCode: 'lab_tests',
    children: [
        {
            label: 'Quick Entry',
            label_ar: 'إدخال سريع',
            icon: Zap,
            href: '/lab/quick-entry',
            description: 'Fast recurring test entry with auto-fill',
        },
        {
            label: 'Test Results',
            label_ar: 'نتائج الفحوصات',
            icon: FileCheck,
            href: '/lab/tests',
            description: 'View test results and statistics',
        },
        {
            label: 'Configuration',
            label_ar: 'التكوين',
            icon: Settings,
            href: '/lab/settings',
            permission: 'configure',
            description: 'Manage test categories, types, and configurations',
        },
        // Optional: Future features
        // {
        //   label: 'Scheduling',
        //   label_ar: 'الجدولة',
        //   icon: Calendar,
        //   href: '/lab-new/schedule',
        //   description: 'Automated test scheduling',
        // },
        // {
        //   label: 'Analytics',
        //   label_ar: 'التحليلات',
        //   icon: BarChart3,
        //   href: '/lab-new/analytics',
        //   description: 'Trend charts and insights',
        // },
    ],
};

/**
 * Usage Example:
 * 
 * In your MainLayout.tsx or navigation config:
 * 
 * import { labTestsNavigation } from './config/labTestsNavigation';
 * 
 * const navigationItems = [
 *   // ... other items
 *   labTestsNavigation,
 *   // ... other items
 * ];
 */
