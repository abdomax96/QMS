# QMS (Quality Management System) & NCR Tracker

A comprehensive Quality Management System (QMS) focused on Non-Conformance Reports (NCR). This monorepo contains the Web application, the Mobile application, and the Supabase database configurations.

## ?? Repository Structure

This repository is structured as a Monorepo:

- **`/src`**: The Web Application (React + Vite + TypeScript + TailwindCSS).
- **`/mobile`**: The Mobile Application (Flutter + Dart) for Android/iOS.
- **`/supabase`**: Database schemas, migrations, and Edge Functions.
- **`/scripts`**: Deployment and automation scripts (e.g., `deploy-pages.ps1`).
- **`/docs`**: Additional documentation (Deployment, architecture, etc.).

## ?? Technologies Used

- **Web Frontend**: React, Vite, TypeScript, TailwindCSS
- **Mobile Frontend**: Flutter, Dart, Riverpod
- **Backend & Database**: Supabase (PostgreSQL, Auth, RLS, Storage, Realtime)
- **Hosting**: Cloudflare Pages (Web)

## ?? Setup & Development

### 1. Web Application
To run the web application locally:
```bash
npm install
npm run dev
```
Make sure to configure your `.env.development.local` file with the Supabase URL and Anon Key.

### 2. Mobile Application
To run the Flutter mobile app:
```bash
cd mobile
flutter pub get
flutter run
```
Check `mobile/README.md` for more detailed mobile-specific instructions and build commands.

## ?? Environments & Deployment

We maintain a strict separation between Development and Production environments:

- **Development Branch (`develop`)**:
  - Deployed to: `https://qms-dev.pages.dev`
  - Uses Supabase Dev instance.
- **Production Branch (`main`)**:
  - Deployed to: `https://qms-prod.pages.dev`
  - Uses Supabase Production instance.
  - **No direct commits to `main` are allowed.** All features must be merged from `develop` via Pull Requests.

## ?? Features

- **Multi-tenant Architecture**: Supports multiple companies.
- **Role-Based Access Control (RBAC)**: Deeply integrated with Supabase Row Level Security (RLS).
- **5-Stage NCR Workflow**:
  1. Initial Report
  2. Root Cause Analysis
  3. CAPA Planning
  4. CAPA Execution
  5. Verification & Closure
- **Hold & Sorting Logic**: Manage reserved quantities securely.
- **Realtime Comments & Offline Drafts**: Full support for interactive team collaboration.

