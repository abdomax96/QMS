# Responsive Master Plan (Systematic, Module-by-Module)

## Objective
Make the full QMS app clear, touch-friendly, and reliable on mobile (360px+) and desktop, without changing business logic.

## Current Baseline (workspace audit - 2026-02-23)
- Route pages loaded from `src/App.tsx`: 73 pages.
- Route pages directly touched for responsive work: 12/73.
- Total modified files in workspace related to responsive pass: 33 files.
- Build status: `npm run build -- --mode development` passes (warnings only).

## What Is Done vs Not Done (High level)

### A) Implemented (needs final module QA)
- Foundation shell (mobile nav and layout refinements)
  - `src/layouts/MainLayout.tsx`
- Forms & Reports core flow
  - `src/pages/UnifiedFormsReports.tsx`
  - `src/pages/Folders.tsx`
  - `src/pages/FormDesigner.tsx`
  - `src/pages/DataEntryPage.tsx`
  - `src/pages/ReportViewer.tsx`
  - `src/components/forms/FormRenderer.tsx`
  - `src/components/tables/RecipeTraceabilityTable.tsx`
  - `src/pages/Dashboard.tsx`
- Documents module
  - `src/pages/documents/DocumentsPage.tsx`
  - `src/pages/documents/DocumentDetailsPage.tsx`
  - `src/pages/documents/VariablesPage.tsx`
  - plus document editor/shared components
- Tasks module
  - `src/pages/tasks/TasksPage.tsx`
  - `src/pages/tasks/TaskDetailsPage.tsx`
  - plus task workflow/assignment components

### B) Started lightly
- NCR settings shell only
  - `src/pages/ncr/SettingsPage.tsx`

### C) Not started (full responsive pass still required)
- NCR core pages + HOLDS
- Lab V2 pages
- Lab V1/legacy pages
- Food Safety module
- Pallet module
- Production module
- Chat pages
- Admin/support pages (Audit, Error dashboard, users, profile, settings side pages)
- Auth/login and remaining utility pages

## Non-random Execution Model (mandatory)
Work strictly module-by-module. Do not open a new module before passing the current module gate.

### Module lifecycle
1. Scope freeze for module pages/components.
2. Mobile UX pass (layout + navigation + actions).
3. Data views pass (tables/cards/drawers).
4. Form interactions pass (inputs, validation, dialogs, keyboard).
5. QA gate (device matrix + regression checks).
6. Module sign-off note in backlog file.

## Shared UI Rules (apply in every module)
- Breakpoints: 360, 390, 768, 1024, 1280.
- No page-level horizontal overflow at 360px.
- Primary actions always visible without horizontal scroll.
- Touch target min size: 40px.
- Forms: 1-column on phone, 2+ columns only from tablet up.
- Tables on mobile:
  - Do not force full multi-column table.
  - Use card rows or compact row details for dense datasets.
  - Keep print/A4 views independent and unchanged by mobile layout.
- Dialogs:
  - Full-screen or near full-screen on phone when content is long.
  - Internal scroll must work without trapping body scroll.
- Sticky bars:
  - Top action bars should wrap safely and not hide controls.

## Module Gate (Definition of Done)
A module is complete only if all are true:
- All module pages pass manual checks on 360 and 390 widths.
- No clipped text/controls in Arabic (RTL).
- All create/edit/delete/search/filter flows are usable by touch.
- Dense tables are readable (card or adaptive strategy).
- Print flows (where present) remain desktop/A4 correct.
- Build passes and no new TypeScript errors.
- Backlog status updated to `DONE` for all pages in module.

## Execution Order (deep, production-style)

### Phase 0: Stabilize already touched work
1. Foundation shell hardening
2. Forms & Reports final QA and fixes
3. Documents final QA and fixes
4. Tasks final QA and fixes

### Phase 1: Business-critical untouched modules
5. NCR + HOLDS
6. Lab V2
7. Lab V1/legacy lab pages (only still-used screens first)
8. Food Safety
9. Pallet
10. Production

### Phase 2: Remaining platform pages
11. Chat
12. Admin/support/auth pages

## Quality Control Matrix per module
- Phone small: 360x800
- Phone large: 390x844
- Tablet: 768x1024
- Desktop: 1366x768

For each page capture:
- Screenshot before/after
- Open issues list
- Fixed issues list
- Final pass result

## Tracking files
- Master strategy: `docs/responsive-master-plan.md`
- Page/module tracker: `docs/responsive-page-backlog.md`
