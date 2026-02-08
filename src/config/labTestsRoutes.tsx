/**
 * Lab Tests Routes Configuration
 * إعدادات مسارات فحوصات المعمل
 * 
 * Add these routes to your router configuration
 */

import { lazy } from 'react';

// Lazy load lab test pages
const LabSettingsPage = lazy(() => import('../pages/lab/LabSettingsPage'));
const QuickTestEntryPage = lazy(() => import('../pages/lab/QuickTestEntryPage'));
const TestResultsPage = lazy(() => import('../pages/lab/TestResultsPage'));
const TestConfigEditor = lazy(() => import('../pages/lab/TestConfigEditor'));

/**
 * Lab Tests Routes
 * 
 * Add these to your router configuration
 */
export const labTestsRoutes = [
    {
        path: '/lab-new/settings',
        element: <LabSettingsPage />,
        meta: {
            title: 'Lab Configuration',
            moduleCode: 'lab_tests',
            permission: 'configure',
        },
    },
    {
        path: '/lab-new/config/new',
        element: <TestConfigEditor />,
        meta: {
            title: 'New Test Configuration',
            moduleCode: 'lab_tests',
            permission: 'configure',
        },
    },
    {
        path: '/lab-new/config/:id',
        element: <TestConfigEditor />,
        meta: {
            title: 'Edit Test Configuration',
            moduleCode: 'lab_tests',
            permission: 'configure',
        },
    },
    {
        path: '/lab-new/quick-entry',
        element: <QuickTestEntryPage />,
        meta: {
            title: 'Quick Test Entry',
            moduleCode: 'lab_tests',
            permission: 'create',
        },
    },
    {
        path: '/lab-new/results',
        element: <TestResultsPage />,
        meta: {
            title: 'Test Results',
            moduleCode: 'lab_tests',
            permission: 'view',
        },
    },
];

/**
 * Usage Example 1 - React Router v6:
 * 
 * import { Routes, Route } from 'react-router-dom';
 * import { labTestsRoutes } from './config/labTestsRoutes';
 * 
 * <Routes>
 *   {labTestsRoutes.map((route) => (
 *     <Route key={route.path} path={route.path} element={route.element} />
 *   ))}
 * </Routes>
 * 
 * 
 * Usage Example 2 - Single Router Array:
 * 
 * import { labTestsRoutes } from './config/labTestsRoutes';
 * 
 * const routes = [
 *   // ... other routes
 *   ...labTestsRoutes,
 *   // ... other routes
 * ];
 * 
 * 
 * Usage Example 3 - createBrowserRouter:
 * 
 * import { createBrowserRouter } from 'react-router-dom';
 * import { labTestsRoutes } from './config/labTestsRoutes';
 * 
 * const router = createBrowserRouter([
 *   {
 *     path: '/',
 *     element: <Layout />,
 *     children: [
 *       // ... other routes
 *       ...labTestsRoutes,
 *     ],
 *   },
 * ]);
 */
