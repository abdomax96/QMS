# Responsive Page Backlog (Module Gate Tracker)

Status legend:
- `DONE_IMPL` = implementation exists, module QA gate still required
- `IN_PROGRESS` = partially addressed
- `TODO` = not started

## Phase 0 - Stabilize touched modules (complete these first)

### M0.1 Foundation / Layout
Module status: `IN_PROGRESS`
- `src/layouts/MainLayout.tsx` - `DONE_IMPL`
- `src/components/forms/StaticTabs.tsx` - `DONE_IMPL`
- `src/components/folders/QuickAccessSidebar.tsx` - `DONE_IMPL`
- `src/components/unified-folders/CreateFolderDialog.tsx` - `DONE_IMPL`
- `src/components/unified-folders/FolderCard.tsx` - `DONE_IMPL`
- `src/components/unified-folders/FolderContentView.tsx` - `DONE_IMPL`
- `src/components/unified-folders/ShareDialog.tsx` - `DONE_IMPL`
- `src/components/unified-folders/SharedContentView.tsx` - `DONE_IMPL`

Gate checklist:
- [ ] mobile navigation + drawer behavior stable
- [ ] no transparent/low-contrast quick access content
- [ ] all header actions usable at 360px

### M0.2 Forms & Reports
Module status: `IN_PROGRESS`
- `src/pages/Dashboard.tsx` - `DONE_IMPL`
- `src/pages/Folders.tsx` - `DONE_IMPL`
- `src/pages/UnifiedFormsReports.tsx` - `DONE_IMPL`
- `src/pages/FormDesigner.tsx` - `DONE_IMPL`
- `src/pages/DataEntryPage.tsx` - `DONE_IMPL`
- `src/pages/ReportViewer.tsx` - `DONE_IMPL`
- `src/components/forms/FormRenderer.tsx` - `DONE_IMPL`
- `src/components/tables/RecipeTraceabilityTable.tsx` - `DONE_IMPL`

Gate checklist:
- [ ] forms entry full workflow on phone (create/edit/save)
- [ ] all dense report tables use mobile-friendly strategy
- [ ] report print/PDF remains A4 and unaffected

### M0.3 Documents
Module status: `IN_PROGRESS`
- `src/pages/documents/DocumentsPage.tsx` - `DONE_IMPL`
- `src/pages/documents/DocumentDetailsPage.tsx` - `DONE_IMPL`
- `src/pages/documents/DocumentDetailsPage.css` - `DONE_IMPL`
- `src/pages/documents/VariablesPage.tsx` - `DONE_IMPL`
- `src/components/documents/DocumentForm.tsx` - `DONE_IMPL`
- `src/components/documents/DocumentVariables.tsx` - `DONE_IMPL`
- `src/components/documents/ShareDocument.tsx` - `DONE_IMPL`
- `src/components/documents/TinyMCEDocumentEditor.tsx` - `DONE_IMPL`
- `src/components/documents/TinyMCEDocumentEditor.css` - `DONE_IMPL`
- `src/components/documents/variables/VariableSelectorModal.tsx` - `DONE_IMPL`
- `src/components/documents/variables/VariablesManager.tsx` - `DONE_IMPL`

Gate checklist:
- [ ] editor toolbar + dialogs fully usable on phone
- [ ] variable insertion/selectors readable and touch-friendly
- [ ] share dialogs and list actions accessible without overlap

### M0.4 Tasks
Module status: `IN_PROGRESS`
- `src/pages/tasks/TasksPage.tsx` - `DONE_IMPL`
- `src/pages/tasks/TaskDetailsPage.tsx` - `DONE_IMPL`
- `src/components/tasks/TaskWorkflowPanel.tsx` - `DONE_IMPL`
- `src/components/tasks/TaskAssignments.tsx` - `DONE_IMPL`
- `src/components/tasks/TaskApprovalPanel.tsx` - `DONE_IMPL`

Gate checklist:
- [ ] task creation/assignment/approval flow at 360px
- [ ] timeline/workflow controls not clipped
- [ ] all task actions reachable by one-hand touch

## Phase 1 - Untouched critical modules

### M1.1 NCR + HOLDS
Module status: `TODO`
- `src/pages/ncr/NcrDashboardPage.tsx` - `TODO`
- `src/pages/ncr/NcrListPage.tsx` - `TODO`
- `src/pages/ncr/NcrNewPage.tsx` - `TODO`
- `src/pages/ncr/NcrDetailsPage.tsx` - `TODO`
- `src/pages/ncr/NcrConfigPage.tsx` - `TODO`
- `src/pages/ncr/HoldsPage.tsx` - `TODO`
- `src/pages/ncr/SettingsPage.tsx` - `IN_PROGRESS`

### M1.2 Lab V2
Module status: `TODO`
- `src/modules/lab_v2/pages/LabV2DashboardPage.tsx` - `TODO`
- `src/modules/lab_v2/pages/DevicesPage.tsx` - `TODO`
- `src/modules/lab_v2/pages/DeviceDetailsPage.tsx` - `TODO`
- `src/modules/lab_v2/pages/ChemicalsPage.tsx` - `TODO`
- `src/modules/lab_v2/pages/TestCatalogPage.tsx` - `TODO`
- `src/modules/lab_v2/pages/TestEditorPage.tsx` - `TODO`
- `src/modules/lab_v2/pages/TestRunsPage.tsx` - `TODO`
- `src/modules/lab_v2/pages/TestRunPage.tsx` - `TODO`
- `src/modules/lab_v2/pages/LabReportsPage.tsx` - `TODO`
- `src/modules/lab_v2/pages/LabV2SettingsPage.tsx` - `TODO`

### M1.3 Lab V1 / legacy routes
Module status: `TODO`
- `src/pages/lab/LabDashboardPage.tsx` - `TODO`
- `src/pages/lab/LabTestsDashboard.tsx` - `TODO`
- `src/pages/lab/TestResultsPage.tsx` - `TODO`
- `src/pages/lab/LabAnalyticsPage.tsx` - `TODO`
- `src/pages/lab/LabSettingsPage.tsx` - `TODO`
- `src/pages/lab/TestConfigEditor.tsx` - `TODO`
- `src/pages/lab/QuickTestEntryPage.tsx` - `TODO`
- `src/pages/lab/MaterialReceivingPage.tsx` - `TODO`
- `src/pages/lab/NewMaterialReceivingPage.tsx` - `TODO`
- `src/pages/lab/MaterialReceivingDetailsPage.tsx` - `TODO`
- `src/pages/lab/SuppliersPage.tsx` - `TODO`
- `src/pages/lab/MaterialsPage.tsx` - `TODO`
- `src/pages/lab/MaterialDetailsPage.tsx` - `TODO`
- `src/pages/lab/InspectionCriteriaPage.tsx` - `TODO`
- `src/pages/lab/CompaniesPage.tsx` - `TODO`
- `src/pages/lab/LabTestDetailsPage.tsx` - `TODO`

### M1.4 Food Safety
Module status: `TODO`
- `src/pages/food-safety/FoodSafetyDashboard.tsx` - `TODO`
- `src/pages/food-safety/TemperatureMonitoring.tsx` - `TODO`
- `src/pages/food-safety/SanitationManagement.tsx` - `TODO`
- `src/pages/food-safety/AllergenManagement.tsx` - `TODO`
- `src/pages/food-safety/PreOpCheckPage.tsx` - `TODO`

### M1.5 Pallet
Module status: `TODO`
- `src/pages/pallet/PalletDashboard.tsx` - `TODO`
- `src/pages/pallet/ProductionView.tsx` - `TODO`
- `src/pages/pallet/WarehouseView.tsx` - `TODO`
- `src/pages/pallet/QualityView.tsx` - `TODO`
- `src/pages/pallet/PalletReports.tsx` - `TODO`
- `src/pages/pallet/PalletList.tsx` - `TODO`
- `src/pages/pallet/PalletSettings.tsx` - `TODO`

### M1.6 Production
Module status: `TODO`
- `src/pages/production/ProductionDashboard.tsx` - `TODO`
- `src/pages/production/ProductionNew.tsx` - `TODO`
- `src/pages/production/ProductionDetails.tsx` - `TODO`

## Phase 2 - Remaining platform pages

### M2.1 Chat
Module status: `TODO`
- `src/pages/chat/ChatPage.tsx` - `TODO`
- `src/pages/chat/MattermostPage.tsx` - `TODO`

### M2.2 Admin / profile / utility
Module status: `TODO`
- `src/pages/admin/UserManagementPage.tsx` - `TODO`
- `src/pages/admin/AuditLogPage.tsx` - `TODO`
- `src/pages/admin/ErrorDashboardPage.tsx` - `TODO`
- `src/pages/PermissionsPage.tsx` - `TODO`
- `src/pages/DepartmentsPage.tsx` - `TODO`
- `src/pages/ProfilePage.tsx` - `TODO`
- `src/pages/UserSettingsPage.tsx` - `TODO`
- `src/pages/RecycleBinPage.tsx` - `TODO`
- `src/pages/ArchivePage.tsx` - `TODO`
- `src/pages/auth/LoginPage.tsx` - `TODO`
- `src/pages/UnauthorizedPage.tsx` - `TODO`

## Execution rule
Do not open a new module until current module gate checklist is fully checked.
