import { useEffect, Suspense, lazy, useRef } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useParams, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import RouteErrorElement from './components/common/RouteErrorElement';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ModuleRoute, FormsReportsRoute, TasksRoute, NcrRoute } from './components/auth/ModuleRoute';

// Unauthorized page
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FormDesigner = lazy(() => import('./pages/FormDesigner'));
const DataEntryPage = lazy(() => import('./pages/DataEntryPage'));
const ReportViewer = lazy(() => import('./pages/ReportViewerA4'));
const FoldersPage = lazy(() => import('./pages/Folders'));
// const UnifiedFormsReports = lazy(() => import('./pages/UnifiedFormsReports'));

// NCR Pages - lazy loaded
const NcrListPage = lazy(() => import('./pages/ncr/NcrListPage'));
const NcrNewPage = lazy(() => import('./pages/ncr/NcrNewPage'));
const NcrDetailsPage = lazy(() => import('./pages/ncr/NcrDetailsPage'));
const NcrDashboardPage = lazy(() => import('./pages/ncr/NcrDashboardPage'));
const NcrConfigPage = lazy(() => import('./pages/ncr/NcrConfigPage'));

// User Pages - lazy loaded
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const UserSettingsPage = lazy(() => import('./pages/UserSettingsPage'));

// Task Pages - lazy loaded
const TasksPage = lazy(() => import('./pages/tasks/TasksPage'));
const TaskDetailsPage = lazy(() => import('./pages/tasks/TaskDetailsPage'));
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const MattermostPage = lazy(() => import('./pages/chat/MattermostPage'));

// Lab Pages (Legacy) - lazy loaded
const LabOldDashboardPage = lazy(() => import('./pages/lab/LabDashboardPage'));
const MaterialReceivingPage = lazy(() => import('./pages/lab/MaterialReceivingPage'));
const NewMaterialReceivingPage = lazy(() => import('./pages/lab/NewMaterialReceivingPage'));
const MaterialReceivingDetailsPage = lazy(() => import('./pages/lab/MaterialReceivingDetailsPage'));
const SuppliersPage = lazy(() => import('./pages/lab/SuppliersPage'));
const MaterialsPage = lazy(() => import('./pages/lab/MaterialsPage'));
const MaterialDetailsPage = lazy(() => import('./pages/lab/MaterialDetailsPage'));
const InspectionCriteriaPage = lazy(() => import('./pages/lab/InspectionCriteriaPage'));
const CompaniesPage = lazy(() => import('./pages/lab/CompaniesPage'));
const LabTestDetailsPage = lazy(() => import('./pages/lab/LabTestDetailsPage'));

// Lab V2 Pages - lazy loaded
const LabV2DashboardPage = lazy(() => import('./modules/lab_v2/pages/LabV2DashboardPage'));
const LabV2DevicesPage = lazy(() => import('./modules/lab_v2/pages/DevicesPage'));
const LabV2DeviceDetailsPage = lazy(() => import('./modules/lab_v2/pages/DeviceDetailsPage'));
const LabV2ChemicalsPage = lazy(() => import('./modules/lab_v2/pages/ChemicalsPage'));
const LabV2TestCatalogPage = lazy(() => import('./modules/lab_v2/pages/TestCatalogPage'));
const LabV2TestEditorPage = lazy(() => import('./modules/lab_v2/pages/TestEditorPage'));
const LabV2TestRunsPage = lazy(() => import('./modules/lab_v2/pages/TestRunsPage'));
const LabV2TestRunPage = lazy(() => import('./modules/lab_v2/pages/TestRunPage'));
const LabV2ReportsPage = lazy(() => import('./modules/lab_v2/pages/LabReportsPage'));
const LabV2SettingsPage = lazy(() => import('./modules/lab_v2/pages/LabV2SettingsPage'));

// Lab Tests Dynamic System (New)
const QuickTestEntryPage = lazy(() => import('./pages/lab/QuickTestEntryPage'));
const LabTestsDashboard = lazy(() => import('./pages/lab/LabTestsDashboard'));
const TestResultsPage = lazy(() => import('./pages/lab/TestResultsPage'));
const LabAnalyticsPage = lazy(() => import('./pages/lab/LabAnalyticsPage'));
const TestConfigEditor = lazy(() => import('./pages/lab/TestConfigEditor'));
const LabSettingsPage = lazy(() => import('./pages/lab/LabSettingsPage'));

// Food Safety Pages - lazy loaded
const FoodSafetyDashboard = lazy(() => import('./pages/food-safety/FoodSafetyDashboard'));
const TemperatureMonitoring = lazy(() => import('./pages/food-safety/TemperatureMonitoring'));
const SanitationManagement = lazy(() => import('./pages/food-safety/SanitationManagement'));
const AllergenManagement = lazy(() => import('./pages/food-safety/AllergenManagement'));
const PreOpCheckPage = lazy(() => import('./pages/food-safety/PreOpCheckPage'));

// Auth Pages - lazy loaded
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));

// NCR Pages 
const HoldsPage = lazy(() => import('./pages/ncr/HoldsPage'));
const SettingsPage = lazy(() => import('./pages/ncr/SettingsPage'));

// Admin Pages - lazy loaded
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const RecycleBinPage = lazy(() => import('./pages/RecycleBinPage'));
const ArchivePage = lazy(() => import('./pages/ArchivePage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));
const ErrorDashboardPage = lazy(() => import('./pages/admin/ErrorDashboardPage'));
const PermissionsPage = lazy(() => import('./pages/PermissionsPage'));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));

// Production Module - lazy loaded
const ProductionDashboard = lazy(() => import('./pages/production/ProductionDashboard'));
const ProductionNew = lazy(() => import('./pages/production/ProductionNew'));
const ProductionDetails = lazy(() => import('./pages/production/ProductionDetails'));

// Document Control - lazy loaded
const DocumentsPage = lazy(() => import('./pages/documents/DocumentsPage'));
const DocumentDetailsPage = lazy(() => import('./pages/documents/DocumentDetailsPage'));
const VariablesPage = lazy(() => import('./pages/documents/VariablesPage'));

// Pallet Management - lazy loaded (V1 - kept for backward compatibility)
const PalletDashboard = lazy(() => import('./pages/pallet/PalletDashboard'));
const ProductionView = lazy(() => import('./pages/pallet/ProductionView'));
const WarehouseView = lazy(() => import('./pages/pallet/WarehouseView'));
const QualityView = lazy(() => import('./pages/pallet/QualityView'));
const PalletReports = lazy(() => import('./pages/pallet/PalletReports'));
const PalletSettings = lazy(() => import('./pages/pallet/PalletSettings'));
const PalletList = lazy(() => import('./pages/pallet/PalletList'));




import useStore from './store';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useAuthStore } from './store/authStore';
import { useCompanyStore } from './store/companyStore';
import { ToastContainer } from './components/common/Toast';
import { useToastStore } from './store/toastStore';
import { useTabsStore } from './store/tabsStore';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { useVisibilityRefresh } from './hooks/useVisibilityRefresh';
import {
  FullPageLoading,
  PageSkeleton,
  TableSkeleton,
  FormSkeleton,
  DetailPageSkeleton,
  LabDashboardSkeleton,
  SettingsSkeleton
} from './components/common/LoadingStates';

// Create React Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes - data stays fresh longer
      gcTime: 1000 * 60 * 30,    // 30 minutes cache time
      retry: 2,                   // Retry failed requests twice
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true,   // Refetch when reconnecting
    },
    mutations: {
      retry: 1,
    }
  }
});

// Route-aware loading fallback to better match page structure.
const PageLoader = () => {
  const { pathname } = useLocation();

  if (pathname === '/login' || pathname === '/unauthorized') {
    return <FullPageLoading />;
  }

  if (pathname.startsWith('/forms/new') || pathname.startsWith('/forms/edit') || pathname.startsWith('/entry/')) {
    return (
      <div className="p-4 sm:p-6">
        <FormSkeleton />
      </div>
    );
  }

  if (pathname.startsWith('/reports/') || pathname.startsWith('/instances/')) {
    return <DetailPageSkeleton />;
  }

  if (pathname.startsWith('/folders') || pathname.startsWith('/forms&reports') || pathname.startsWith('/documents') || pathname.startsWith('/tasks')) {
    return (
      <div className="p-4 sm:p-6">
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (pathname.startsWith('/lab') || pathname.startsWith('/food-safety') || pathname.startsWith('/ncr')) {
    return <LabDashboardSkeleton />;
  }

  if (pathname.startsWith('/settings') || pathname.startsWith('/permissions') || pathname.startsWith('/departments')) {
    return <SettingsSkeleton />;
  }

  return <PageSkeleton />;
};

// Redirect helpers for legacy `/lab-old/*` routes that include path params.
const LabOldConfigRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/lab/config/${id}` : '/lab/config'} replace />;
};

const LabOldReceivingDetailsRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/lab/receiving/${id}` : '/lab/receiving'} replace />;
};

const LabOldReceivingEditRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/lab/receiving/${id}/edit` : '/lab/receiving'} replace />;
};

const LabOldMaterialDetailsRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/lab/materials/${id}` : '/lab/materials'} replace />;
};

// Redirect helpers for legacy Lab V2 routes that used to live under `/lab/*`.
// Canonical Lab V2 lives under `/lab/tests/*`.
const LabV2DeviceDetailsRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/lab/tests/devices/${id}` : '/lab/tests/devices'} replace />;
};

const LabV2RunDetailsRedirect = () => {
  const { runId } = useParams<{ runId: string }>();
  return <Navigate to={runId ? `/lab/tests/runs/${runId}` : '/lab/tests/runs'} replace />;
};

// Define router configuration
const router = createBrowserRouter([
  {
    path: "/login",
    errorElement: <RouteErrorElement />,
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    )
  },
  {
    path: "/unauthorized",
    errorElement: <RouteErrorElement />,
    element: (
      <Suspense fallback={<PageLoader />}>
        <UnauthorizedPage />
      </Suspense>
    )
  },
  {
    path: "/",
    errorElement: <RouteErrorElement />,
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        )
      },
      // ==================== Forms & Reports Module ====================
      {
        path: "folders",
        element: (
          <FormsReportsRoute>
            <Suspense fallback={<PageLoader />}>
              <FoldersPage />
            </Suspense>
          </FormsReportsRoute>
        )
      },
      {
        path: "folders/:folderId",
        element: (
          <FormsReportsRoute>
            <Suspense fallback={<PageLoader />}>
              <FoldersPage />
            </Suspense>
          </FormsReportsRoute>
        )
      },
      {
        path: "forms&reports",
        element: (
          <FormsReportsRoute>
            <Suspense fallback={<PageLoader />}>
              <FoldersPage />
            </Suspense>
          </FormsReportsRoute>
        )
      },
      {
        path: "forms&reports/:folderId",
        element: (
          <FormsReportsRoute>
            <Suspense fallback={<PageLoader />}>
              <FoldersPage />
            </Suspense>
          </FormsReportsRoute>
        )
      },
      {
        path: "forms/new",
        element: (
          <FormsReportsRoute action="create">
            <Suspense fallback={<PageLoader />}>
              <FormDesigner />
            </Suspense>
          </FormsReportsRoute>
        )
      },
      {
        path: "forms/edit/:templateId",
        element: (
          <FormsReportsRoute action="edit">
            <Suspense fallback={<PageLoader />}>
              <FormDesigner />
            </Suspense>
          </FormsReportsRoute>
        )
      },
      {
        path: "forms/preview/:templateId",
        element: (
          <FormsReportsRoute>
            <Suspense fallback={<PageLoader />}>
              <ReportViewer />
            </Suspense>
          </FormsReportsRoute>
        )
      },
      {
        path: "reports",
        element: <Navigate to="/forms&reports" replace />
      },
      {
        path: "reports/new/:templateId",
        element: (
          <FormsReportsRoute action="create">
            <Suspense fallback={<PageLoader />}>
              <DataEntryPage />
            </Suspense>
          </FormsReportsRoute>
        )
      },
      {
        path: "reports/edit/:instanceId",
        element: (
          <FormsReportsRoute action="edit">
            <Suspense fallback={<PageLoader />}>
              <DataEntryPage />
            </Suspense>
          </FormsReportsRoute>
        )
      },
      {
        path: "reports/view/:instanceId",
        element: (
          <FormsReportsRoute>
            <Suspense fallback={<PageLoader />}>
              <ReportViewer />
            </Suspense>
          </FormsReportsRoute>
        )
      },
      // ==================== Document Control Module ====================
      {
        path: "documents",
        element: (
          <Suspense fallback={<PageLoader />}>
            <DocumentsPage />
          </Suspense>
        )
      },
      {
        path: "documents/variables",
        element: (
          <Suspense fallback={<PageLoader />}>
            <VariablesPage />
          </Suspense>
        )
      },
      {
        path: "documents/:id",
        element: (
          <Suspense fallback={<PageLoader />}>
            <DocumentDetailsPage />
          </Suspense>
        )
      },
      // ==================== NCR & Holds Module ====================
      {
        path: "ncr/dashboard",
        element: (
          <NcrRoute>
            <Suspense fallback={<PageLoader />}>
              <NcrDashboardPage />
            </Suspense>
          </NcrRoute>
        )
      },
      {
        path: "ncr",
        element: (
          <NcrRoute>
            <NcrListPage />
          </NcrRoute>
        )
      },
      {
        path: "ncr/new",
        element: (
          <NcrRoute action="create">
            <NcrNewPage />
          </NcrRoute>
        )
      },
      {
        path: "ncr/settings",
        element: (
          <NcrRoute>
            <Suspense fallback={<PageLoader />}>
              <NcrConfigPage />
            </Suspense>
          </NcrRoute>
        )
      },
      {
        path: "ncr/:id",
        element: (
          <NcrRoute>
            <NcrDetailsPage />
          </NcrRoute>
        )
      },
      {
        path: "holds",
        element: (
          <NcrRoute>
            <HoldsPage />
          </NcrRoute>
        )
      },
      {
        path: "settings",
        element: <SettingsPage />
      },
      {
        path: "users",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UserManagementPage />
          </Suspense>
        )
      },
      {
        path: "profile",
        element: <ProfilePage />
      },
      {
        path: "recycle-bin",
        element: (
          <Suspense fallback={<PageLoader />}>
            <RecycleBinPage />
          </Suspense>
        )
      },
      {
        path: "archive",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ArchivePage />
          </Suspense>
        )
      },
      {
        path: "user-settings",
        element: <UserSettingsPage />
      },
      {
        path: "audit",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AuditLogPage />
          </Suspense>
        )
      },
      {
        path: "error-dashboard",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorDashboardPage />
          </Suspense>
        )
      },
      // ==================== Pallet Module ====================
      {
        path: "pallet",
        element: (
          <Suspense fallback={<PageLoader />}>
            <PalletDashboard />
          </Suspense>
        )
      },
      {
        path: "pallet/production",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductionView />
          </Suspense>
        )
      },
      {
        path: "pallet/warehouse",
        element: (
          <Suspense fallback={<PageLoader />}>
            <WarehouseView />
          </Suspense>
        )
      },
      {
        path: "pallet/quality",
        element: (
          <Suspense fallback={<PageLoader />}>
            <QualityView />
          </Suspense>
        )
      },
      {
        path: "pallet/reports",
        element: (
          <Suspense fallback={<PageLoader />}>
            <PalletReports />
          </Suspense>
        )
      },
      {
        path: "pallet/list",
        element: (
          <Suspense fallback={<PageLoader />}>
            <PalletList />
          </Suspense>
        )
      },
      {
        path: "pallet/settings",
        element: (
          <Suspense fallback={<PageLoader />}>
            <PalletSettings />
          </Suspense>
        )
      },
      // ==================== Tasks Module ====================
      {
        path: "tasks",
        element: (
          <TasksRoute>
            <TasksPage />
          </TasksRoute>
        )
      },
      {
        path: "tasks/:id",
        element: (
          <TasksRoute>
            <TaskDetailsPage />
          </TasksRoute>
        )
      },
      // ==================== Chat Module ====================
      {
        path: "chat",
        element: (
          <ModuleRoute module="chat" action="view_conversations">
            <Suspense fallback={<PageLoader />}>
              {import.meta.env.VITE_CHAT_PROVIDER === 'mattermost' ? (
                <MattermostPage />
              ) : (
                <ChatPage />
              )}
            </Suspense>
          </ModuleRoute>
        )
      },
      // ==================== Laboratory Module ====================
      {
        path: "lab",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabOldDashboardPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2DashboardPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/devices",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2DevicesPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/devices/:id",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2DeviceDetailsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/chemicals",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2ChemicalsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/catalog",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2TestCatalogPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/editor/new",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2TestEditorPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/editor/:id",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2TestEditorPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/runs",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2TestRunsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/runs/:runId",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2TestRunPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/reports",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2ReportsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/settings",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabV2SettingsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        // Legacy V1 tests/results page (kept for compatibility)
        path: "lab/tests/results",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <TestResultsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/results/:id",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabTestDetailsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/dashboard",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabTestsDashboard />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/tests/v1/settings",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabSettingsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      // ==================== Laboratory Module (Lab V2 Legacy Aliases - Deprecated) ====================
      {
        path: "lab/devices",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/tests/devices" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab/devices/:id",
        element: (
          <ModuleRoute module="lab_tests">
            <LabV2DeviceDetailsRedirect />
          </ModuleRoute>
        )
      },
      {
        path: "lab/chemicals",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/tests/chemicals" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab/runs",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/tests/runs" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab/runs/:runId",
        element: (
          <ModuleRoute module="lab_tests">
            <LabV2RunDetailsRedirect />
          </ModuleRoute>
        )
      },
      {
        path: "lab/reports",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/tests/reports" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab/settings",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/tests/settings" replace />
          </ModuleRoute>
        )
      },
      // ==================== Laboratory Module (Legacy Aliases - Deprecated) ====================
      {
        path: "lab/quick-entry",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <QuickTestEntryPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/analytics",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <LabAnalyticsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/config/new",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <TestConfigEditor />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/config/:id",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <TestConfigEditor />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/receiving",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <MaterialReceivingPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/receiving/new",
        element: (
          <ModuleRoute module="lab_tests" action="create">
            <Suspense fallback={<PageLoader />}>
              <NewMaterialReceivingPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/receiving/:id",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <MaterialReceivingDetailsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/receiving/:id/edit",
        element: (
          <ModuleRoute module="lab_tests" action="edit">
            <Suspense fallback={<PageLoader />}>
              <NewMaterialReceivingPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/suppliers",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <SuppliersPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/materials",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <MaterialsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/materials/:id",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <MaterialDetailsPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/inspection-criteria",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <InspectionCriteriaPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab/companies",
        element: (
          <ModuleRoute module="lab_tests">
            <Suspense fallback={<PageLoader />}>
              <CompaniesPage />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "lab-old",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/tests-dashboard",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/tests/dashboard" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/tests",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/tests" replace />
          </ModuleRoute>
        )
      },
      {
        // Legacy V1 tests/results page kept for backward compatibility.
        path: "lab-old/tests-legacy",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/tests/results" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/settings",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/tests/v1/settings" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/quick-entry",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/quick-entry" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/analytics",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/analytics" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/config/new",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/config/new" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/config/:id",
        element: (
          <ModuleRoute module="lab_tests">
            <LabOldConfigRedirect />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/receiving",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/receiving" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/receiving/new",
        element: (
          <ModuleRoute module="lab_tests" action="create">
            <Navigate to="/lab/receiving/new" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/receiving/:id",
        element: (
          <ModuleRoute module="lab_tests">
            <LabOldReceivingDetailsRedirect />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/receiving/:id/edit",
        element: (
          <ModuleRoute module="lab_tests" action="edit">
            <LabOldReceivingEditRedirect />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/suppliers",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/suppliers" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/materials",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/materials" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/materials/:id",
        element: (
          <ModuleRoute module="lab_tests">
            <LabOldMaterialDetailsRedirect />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/inspection-criteria",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/inspection-criteria" replace />
          </ModuleRoute>
        )
      },
      {
        path: "lab-old/companies",
        element: (
          <ModuleRoute module="lab_tests">
            <Navigate to="/lab/companies" replace />
          </ModuleRoute>
        )
      },
      {
        path: "food-safety",
        element: (
          <Suspense fallback={<PageLoader />}>
            <FoodSafetyDashboard />
          </Suspense>
        )
      },
      {
        path: "food-safety/temperature",
        element: (
          <Suspense fallback={<PageLoader />}>
            <TemperatureMonitoring />
          </Suspense>
        )
      },
      {
        path: "food-safety/sanitation",
        element: (
          <Suspense fallback={<PageLoader />}>
            <SanitationManagement />
          </Suspense>
        )
      },
      {
        path: "food-safety/allergens",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AllergenManagement />
          </Suspense>
        )
      },
      {
        path: "food-safety/pre-op",
        element: (
          <Suspense fallback={<PageLoader />}>
            <PreOpCheckPage />
          </Suspense>
        )
      },
      // ==================== Pallet Management Module ====================
      {
        path: "pallet",
        element: (
          <ModuleRoute module="pallet_management">
            <Suspense fallback={<PageLoader />}>
              <PalletDashboard />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "pallet/production",
        element: (
          <ModuleRoute module="pallet_management">
            <Suspense fallback={<PageLoader />}>
              <ProductionView />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "pallet/warehouse",
        element: (
          <ModuleRoute module="pallet_management">
            <Suspense fallback={<PageLoader />}>
              <WarehouseView />
            </Suspense>
          </ModuleRoute>
        )
      },
      {
        path: "pallet/quality",
        element: (
          <ModuleRoute module="pallet_management">
            <Suspense fallback={<PageLoader />}>
              <QualityView />
            </Suspense>
          </ModuleRoute>
        )
      }
    ]
  }
]);

function App() {
  const { setUser } = useStore();

  // Initialize Auth Store and Company Store
  useEffect(() => {
    useAuthStore.getState().initialize();

    // Initialize company store to fetch global company setting
    // This ensures consistency across sessions/devices
    useCompanyStore.getState().initialize();
  }, []);

  // Rehydrate tab states from IndexedDB on app start
  useEffect(() => {
    useTabsStore.getState().rehydrateTabStates();
  }, []);

  // Initialize Supabase sync
  const { syncError, isInitialized, loadingProgress } = useSupabaseSync();

  // Get the real authenticated user from Supabase
  const { profile: authProfile } = useSupabaseAuth();

  // Tab unsaved changes detection for BeforeUnload warning
  const hasUnsavedChanges = useTabsStore(state => state.hasUnsavedChanges);

  // Enable real-time sync for folders, templates, and instances
  // Uses stable refs to prevent infinite re-render loops
  // AUDIT FIX: Delta-based realtime sync enabled for multi-user support
  useRealtimeSync({
    syncFolders: isInitialized,
    syncTemplates: isInitialized,
    syncInstances: isInitialized,
    debug: import.meta.env.DEV, // Enable debug logging in development
  });

  // Proactive session refresh when tab becomes visible after idle
  // Prevents stale auth state and infinite loading on navigation
  useVisibilityRefresh({
    minHiddenTime: 60000, // Refresh if hidden for 1+ minute
    debug: import.meta.env.DEV,
  });

  // Warn user when leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = 'لديك تغييرات غير محفوظة. هل أنت متأكد أنك تريد المغادرة؟';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    // Sync the authenticated user to the store
    if (authProfile) {
      // Safely extract role - ensure roles is an array
      const rolesArray = Array.isArray(authProfile.roles) ? authProfile.roles : [];
      const userRole = rolesArray[0] || 'viewer';

      setUser({
        id: authProfile.uid,
        name: authProfile.name || authProfile.email || 'مستخدم',
        email: authProfile.email,
        role: userRole as 'user' | 'viewer' | 'super-admin' | 'admin' | 'manager',
        department: authProfile.department || ''
      });
    }

    // NOTE: Sample folder creation removed to prevent duplicates
    // Folders should be created manually by users or via controlled initialization scripts
    // The old code was creating folders BEFORE Supabase sync completed, causing duplicates
  }, [authProfile, setUser]);

  // Get toasts from store
  const { toasts, removeToast, addToast } = useToastStore();
  const lastSyncErrorRef = useRef<string | null>(null);

  // Non-blocking sync error reporting: keep app usable and notify once per error message.
  useEffect(() => {
    if (!syncError) {
      return;
    }

    if (lastSyncErrorRef.current === syncError) {
      return;
    }

    lastSyncErrorRef.current = syncError;
    addToast({
      type: 'warning',
      message: `تعذر تحميل بعض البيانات مسبقًا: ${syncError}`,
      duration: 5000,
    });
  }, [addToast, syncError]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        {!isInitialized && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
            <div className="rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs text-slate-600 dark:text-slate-200 shadow-sm">
              {loadingProgress?.message || 'جاري تهيئة البيانات الأساسية...'}
            </div>
          </div>
        )}
        <RouterProvider router={router} />
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} position="top-left" />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
