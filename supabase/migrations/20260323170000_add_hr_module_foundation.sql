-- ============================================================
-- HR Module Foundation
-- Dev-first migration for HR + Production attendance integration
-- ============================================================

BEGIN;

SET app.bypass_permission_check = 'on';

-- ------------------------------------------------------------
-- Helper permission functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hr_has_any_action(p_actions text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_actions, ARRAY[]::text[])) AS action_code
    WHERE public.can_access_module(auth.uid(), 'hr', action_code)
);
$$;

CREATE OR REPLACE FUNCTION public.production_has_any_action(p_actions text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_actions, ARRAY[]::text[])) AS action_code
    WHERE public.can_access_module(auth.uid(), 'production', action_code)
);
$$;

-- ------------------------------------------------------------
-- Modules and default role permissions
-- ------------------------------------------------------------
UPDATE public.app_modules
SET
    name = 'Human Resources',
    name_ar = 'الموارد البشرية',
    description = 'Employees, transport, shifts, requests, penalties, payroll, and worker snapshot views.',
    description_ar = 'ملفات العاملين، النقل، الورديات، الطلبات، الجزاءات، المرتبات، وواجهات العامل.',
    icon = 'Users',
    color = '#0F766E',
    display_order = 25,
    is_active = true,
    data_isolation_mode = 'isolated',
    supports_sharing = false,
    available_actions = ARRAY['view','create','edit','approve','export','print','configure','archive','calculate','close','publish']::text[],
    parent_module_code = NULL,
    module_type = 'core',
    is_department_scoped = true,
    updated_at = now()
WHERE code = 'hr';

INSERT INTO public.app_modules (
    code,
    name,
    name_ar,
    description,
    description_ar,
    icon,
    color,
    display_order,
    is_active,
    data_isolation_mode,
    supports_sharing,
    available_actions,
    parent_module_code,
    module_type,
    is_department_scoped
)
SELECT
    'hr',
    'Human Resources',
    'الموارد البشرية',
    'Employees, transport, shifts, requests, penalties, payroll, and worker snapshot views.',
    'ملفات العاملين، النقل، الورديات، الطلبات، الجزاءات، المرتبات، وواجهات العامل.',
    'Users',
    '#0F766E',
    25,
    true,
    'isolated',
    false,
    ARRAY['view','create','edit','approve','export','print','configure','archive','calculate','close','publish']::text[],
    NULL,
    'core',
    true
WHERE NOT EXISTS (
    SELECT 1
    FROM public.app_modules
    WHERE code = 'hr'
);

UPDATE public.app_modules
SET
    name = 'Production',
    name_ar = 'الإنتاج',
    description = 'Production batches and operational attendance capture.',
    description_ar = 'تشغيلات الإنتاج وتسجيل الحضور والانصراف التشغيلي.',
    icon = 'Factory',
    color = '#B45309',
    display_order = 26,
    is_active = true,
    data_isolation_mode = 'isolated',
    supports_sharing = false,
    available_actions = ARRAY['view','create','edit','approve','export','print','attendance.capture','attendance.adjust','attendance.review']::text[],
    parent_module_code = NULL,
    module_type = 'core',
    is_department_scoped = true,
    updated_at = now()
WHERE code = 'production';

INSERT INTO public.app_modules (
    code,
    name,
    name_ar,
    description,
    description_ar,
    icon,
    color,
    display_order,
    is_active,
    data_isolation_mode,
    supports_sharing,
    available_actions,
    parent_module_code,
    module_type,
    is_department_scoped
)
SELECT
    'production',
    'Production',
    'الإنتاج',
    'Production batches and operational attendance capture.',
    'تشغيلات الإنتاج وتسجيل الحضور والانصراف التشغيلي.',
    'Factory',
    '#B45309',
    26,
    true,
    'isolated',
    false,
    ARRAY['view','create','edit','approve','export','print','attendance.capture','attendance.adjust','attendance.review']::text[],
    NULL,
    'core',
    true
WHERE NOT EXISTS (
    SELECT 1
    FROM public.app_modules
    WHERE code = 'production'
);

INSERT INTO public.role_module_permissions (role_id, module_code, granted_actions)
SELECT
    r.id,
    'hr',
    ARRAY['view','create','edit','approve','export','print','configure','archive','calculate','close','publish']::text[]
FROM public.roles r
WHERE lower(COALESCE(r.code, '')) IN ('admin', 'super_admin', 'super-admin', 'hr_manager', 'hr_specialist', 'payroll_manager', 'payroll_specialist')
ON CONFLICT (role_id, module_code) DO UPDATE
SET granted_actions = (
    SELECT array_agg(DISTINCT action_code ORDER BY action_code)
    FROM unnest(COALESCE(public.role_module_permissions.granted_actions, ARRAY[]::text[]) || EXCLUDED.granted_actions) AS action_code
);

INSERT INTO public.role_module_permissions (role_id, module_code, granted_actions)
SELECT
    r.id,
    'production',
    ARRAY['view','create','edit','approve','export','print','attendance.capture','attendance.adjust','attendance.review']::text[]
FROM public.roles r
WHERE lower(COALESCE(r.code, '')) IN ('admin', 'super_admin', 'super-admin', 'production_manager', 'production_supervisor')
ON CONFLICT (role_id, module_code) DO UPDATE
SET granted_actions = (
    SELECT array_agg(DISTINCT action_code ORDER BY action_code)
    FROM unnest(COALESCE(public.role_module_permissions.granted_actions, ARRAY[]::text[]) || EXCLUDED.granted_actions) AS action_code
);

INSERT INTO public.role_module_permissions (role_id, module_code, granted_actions)
SELECT
    r.id,
    'production',
    ARRAY['view','attendance.capture','attendance.adjust']::text[]
FROM public.roles r
WHERE lower(COALESCE(r.code, '')) IN ('production_operator')
ON CONFLICT (role_id, module_code) DO UPDATE
SET granted_actions = (
    SELECT array_agg(DISTINCT action_code ORDER BY action_code)
    FROM unnest(COALESCE(public.role_module_permissions.granted_actions, ARRAY[]::text[]) || EXCLUDED.granted_actions) AS action_code
);

-- ------------------------------------------------------------
-- Core tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_worksites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code text,
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_worksites_name_not_empty CHECK (btrim(name) <> '')
);

CREATE TABLE IF NOT EXISTS public.hr_employee_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL UNIQUE REFERENCES public.company_employees(id) ON DELETE CASCADE,
    worker_type text NOT NULL DEFAULT 'regular',
    original_employee_code text,
    internal_employee_code text,
    job_title_text text,
    worksite_id uuid REFERENCES public.hr_worksites(id) ON DELETE SET NULL,
    primary_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    employment_status text NOT NULL DEFAULT 'active',
    hire_date date,
    notes text,
    account_enabled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_employee_profiles_worker_type_check CHECK (worker_type IN ('regular', 'daily')),
    CONSTRAINT hr_employee_profiles_employment_status_check CHECK (employment_status IN ('active', 'inactive', 'suspended', 'archived'))
);

CREATE TABLE IF NOT EXISTS public.hr_employee_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    worksite_id uuid REFERENCES public.hr_worksites(id) ON DELETE SET NULL,
    department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    job_title_text text,
    assignment_type text NOT NULL DEFAULT 'primary',
    effective_from date NOT NULL DEFAULT current_date,
    effective_to date,
    is_current boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.hr_transport_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code text,
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_transport_lines_name_not_empty CHECK (btrim(name) <> '')
);

CREATE TABLE IF NOT EXISTS public.hr_transport_vehicles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    line_id uuid REFERENCES public.hr_transport_lines(id) ON DELETE SET NULL,
    code text,
    plate_number text,
    capacity integer,
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.hr_employee_transport_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    line_id uuid REFERENCES public.hr_transport_lines(id) ON DELETE SET NULL,
    vehicle_id uuid REFERENCES public.hr_transport_vehicles(id) ON DELETE SET NULL,
    is_default boolean NOT NULL DEFAULT false,
    effective_from date NOT NULL DEFAULT current_date,
    effective_to date,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.hr_shift_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code text,
    name text NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    hours_count numeric(6,2) NOT NULL DEFAULT 8,
    break_minutes integer NOT NULL DEFAULT 0,
    is_night_shift boolean NOT NULL DEFAULT false,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.hr_shift_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    period_start date NOT NULL,
    period_end date NOT NULL,
    version integer NOT NULL DEFAULT 1,
    parent_plan_id uuid REFERENCES public.hr_shift_plans(id) ON DELETE SET NULL,
    published_at timestamptz,
    published_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_shift_plans_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS public.hr_shift_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    shift_plan_id uuid NOT NULL REFERENCES public.hr_shift_plans(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    shift_template_id uuid REFERENCES public.hr_shift_templates(id) ON DELETE SET NULL,
    work_date date NOT NULL,
    is_primary boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_shift_assignments_unique_assignment UNIQUE (shift_plan_id, employee_profile_id, work_date)
);

CREATE TABLE IF NOT EXISTS public.hr_leave_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    is_paid boolean NOT NULL DEFAULT true,
    annual_allowance numeric(10,2) NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_leave_types_company_code_key UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    leave_type_id uuid NOT NULL REFERENCES public.hr_leave_types(id) ON DELETE CASCADE,
    period_year integer NOT NULL,
    opening_balance numeric(10,2) NOT NULL DEFAULT 0,
    earned_balance numeric(10,2) NOT NULL DEFAULT 0,
    used_balance numeric(10,2) NOT NULL DEFAULT 0,
    adjustment_balance numeric(10,2) NOT NULL DEFAULT 0,
    closing_balance numeric(10,2) NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_leave_balances_employee_year_type_key UNIQUE (employee_profile_id, leave_type_id, period_year)
);

CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    leave_type_id uuid REFERENCES public.hr_leave_types(id) ON DELETE SET NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_count numeric(10,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft',
    reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_leave_requests_status_check CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'closed'))
);

CREATE TABLE IF NOT EXISTS public.hr_mission_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    start_at timestamptz NOT NULL,
    end_at timestamptz,
    destination text,
    status text NOT NULL DEFAULT 'draft',
    details text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_mission_requests_status_check CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'closed'))
);

CREATE TABLE IF NOT EXISTS public.hr_permission_allowances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    period_month date NOT NULL,
    minutes_allowed integer NOT NULL DEFAULT 120,
    minutes_used integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_permission_allowances_employee_month_key UNIQUE (employee_profile_id, period_month)
);

CREATE TABLE IF NOT EXISTS public.hr_penalty_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    is_deduction_based boolean NOT NULL DEFAULT true,
    default_amount numeric(12,2) NOT NULL DEFAULT 0,
    print_template_key text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_penalty_types_company_code_key UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.hr_penalty_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    penalty_type_id uuid REFERENCES public.hr_penalty_types(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'draft',
    effective_date date,
    amount numeric(12,2),
    details text,
    reference_number text,
    approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_penalty_records_status_check CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'closed'))
);

CREATE TABLE IF NOT EXISTS public.hr_workflow_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    entity_type text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_workflow_definitions_company_code_key UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.hr_workflow_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    workflow_definition_id uuid NOT NULL REFERENCES public.hr_workflow_definitions(id) ON DELETE CASCADE,
    step_order integer NOT NULL,
    role_code text NOT NULL,
    action_code text NOT NULL DEFAULT 'approve',
    is_required boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_workflow_steps_definition_order_key UNIQUE (workflow_definition_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.hr_policy_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    policy_type text NOT NULL,
    effective_from date NOT NULL DEFAULT current_date,
    effective_to date,
    is_active boolean NOT NULL DEFAULT true,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_policy_definitions_company_code_effective_from_key UNIQUE (company_id, code, effective_from)
);

CREATE TABLE IF NOT EXISTS public.hr_salary_structures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_salary_structures_company_code_key UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.hr_employee_salary_terms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    salary_structure_id uuid REFERENCES public.hr_salary_structures(id) ON DELETE SET NULL,
    base_salary numeric(12,2) NOT NULL DEFAULT 0,
    allowance_amount numeric(12,2) NOT NULL DEFAULT 0,
    fixed_deduction_amount numeric(12,2) NOT NULL DEFAULT 0,
    daily_rate numeric(12,2) NOT NULL DEFAULT 0,
    currency_code text NOT NULL DEFAULT 'EGP',
    effective_from date NOT NULL DEFAULT current_date,
    effective_to date,
    is_active boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.hr_payroll_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status text NOT NULL DEFAULT 'open',
    notes text,
    locked_at timestamptz,
    locked_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_payroll_periods_status_check CHECK (status IN ('open', 'in_review', 'closed')),
    CONSTRAINT hr_payroll_periods_company_code_key UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.hr_payroll_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    payroll_period_id uuid NOT NULL REFERENCES public.hr_payroll_periods(id) ON DELETE CASCADE,
    run_label text,
    run_status text NOT NULL DEFAULT 'draft',
    calculated_at timestamptz,
    calculated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_payroll_runs_status_check CHECK (run_status IN ('draft', 'calculated', 'approved', 'closed'))
);

CREATE TABLE IF NOT EXISTS public.hr_payroll_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    payroll_run_id uuid NOT NULL REFERENCES public.hr_payroll_runs(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    base_salary numeric(12,2) NOT NULL DEFAULT 0,
    allowance_amount numeric(12,2) NOT NULL DEFAULT 0,
    deduction_amount numeric(12,2) NOT NULL DEFAULT 0,
    overtime_hours numeric(10,2) NOT NULL DEFAULT 0,
    overtime_amount numeric(12,2) NOT NULL DEFAULT 0,
    gross_amount numeric(12,2) NOT NULL DEFAULT 0,
    net_amount numeric(12,2) NOT NULL DEFAULT 0,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_payroll_items_run_employee_key UNIQUE (payroll_run_id, employee_profile_id)
);

CREATE TABLE IF NOT EXISTS public.ops_attendance_review_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    batch_date date NOT NULL,
    shift_plan_id uuid REFERENCES public.hr_shift_plans(id) ON DELETE SET NULL,
    review_status text NOT NULL DEFAULT 'draft',
    submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    submitted_at timestamptz,
    reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT ops_attendance_review_batches_status_check CHECK (review_status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'closed')),
    CONSTRAINT ops_attendance_review_batches_company_date_key UNIQUE (company_id, batch_date)
);

CREATE TABLE IF NOT EXISTS public.ops_attendance_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    review_batch_id uuid REFERENCES public.ops_attendance_review_batches(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    shift_assignment_id uuid REFERENCES public.hr_shift_assignments(id) ON DELETE SET NULL,
    event_date date NOT NULL,
    check_in_at timestamptz,
    check_out_at timestamptz,
    attendance_status text NOT NULL DEFAULT 'present',
    source text NOT NULL DEFAULT 'manual',
    notes text,
    captured_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT ops_attendance_events_status_check CHECK (attendance_status IN ('present', 'absent', 'leave', 'mission', 'permission', 'holiday', 'off'))
);

CREATE TABLE IF NOT EXISTS public.ops_attendance_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    attendance_event_id uuid NOT NULL REFERENCES public.ops_attendance_events(id) ON DELETE CASCADE,
    adjustment_type text NOT NULL,
    old_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    new_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    reason text,
    adjusted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    adjusted_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.hr_attendance_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    payroll_period_id uuid NOT NULL REFERENCES public.hr_payroll_periods(id) ON DELETE CASCADE,
    employee_profile_id uuid NOT NULL REFERENCES public.hr_employee_profiles(id) ON DELETE CASCADE,
    source_event_id uuid NOT NULL REFERENCES public.ops_attendance_events(id) ON DELETE CASCADE,
    work_date date NOT NULL,
    attendance_status text NOT NULL,
    worked_minutes integer NOT NULL DEFAULT 0,
    payable_minutes integer NOT NULL DEFAULT 0,
    overtime_minutes integer NOT NULL DEFAULT 0,
    deduction_minutes integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT hr_attendance_ledger_period_event_key UNIQUE (payroll_period_id, source_event_id)
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS hr_worksites_company_code_idx
    ON public.hr_worksites (company_id, lower(code))
    WHERE code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hr_employee_profiles_company_internal_code_idx
    ON public.hr_employee_profiles (company_id, lower(internal_employee_code))
    WHERE internal_employee_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS hr_employee_profiles_company_idx
    ON public.hr_employee_profiles (company_id, employment_status);

CREATE INDEX IF NOT EXISTS hr_employee_assignments_profile_idx
    ON public.hr_employee_assignments (employee_profile_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS hr_transport_assignments_profile_idx
    ON public.hr_employee_transport_assignments (employee_profile_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS hr_shift_plans_company_period_idx
    ON public.hr_shift_plans (company_id, status, period_start, period_end);

CREATE INDEX IF NOT EXISTS hr_shift_assignments_profile_date_idx
    ON public.hr_shift_assignments (employee_profile_id, work_date DESC);

CREATE INDEX IF NOT EXISTS hr_leave_requests_profile_status_idx
    ON public.hr_leave_requests (employee_profile_id, status, start_date DESC);

CREATE INDEX IF NOT EXISTS hr_mission_requests_profile_status_idx
    ON public.hr_mission_requests (employee_profile_id, status, start_at DESC);

CREATE INDEX IF NOT EXISTS hr_penalty_records_profile_status_idx
    ON public.hr_penalty_records (employee_profile_id, status, effective_date DESC);

CREATE INDEX IF NOT EXISTS hr_payroll_periods_company_status_idx
    ON public.hr_payroll_periods (company_id, status, period_start DESC);

CREATE INDEX IF NOT EXISTS hr_payroll_runs_period_status_idx
    ON public.hr_payroll_runs (payroll_period_id, run_status);

CREATE INDEX IF NOT EXISTS hr_payroll_items_profile_idx
    ON public.hr_payroll_items (employee_profile_id, payroll_run_id);

CREATE INDEX IF NOT EXISTS ops_attendance_review_batches_company_status_idx
    ON public.ops_attendance_review_batches (company_id, review_status, batch_date DESC);

CREATE INDEX IF NOT EXISTS ops_attendance_events_profile_date_idx
    ON public.ops_attendance_events (employee_profile_id, event_date DESC);

CREATE INDEX IF NOT EXISTS hr_attendance_ledger_profile_date_idx
    ON public.hr_attendance_ledger (employee_profile_id, work_date DESC);

-- ------------------------------------------------------------
-- Grants, updated_at triggers, and RLS enabling
-- ------------------------------------------------------------
DO $$
DECLARE
    v_table text;
    v_all_tables text[] := ARRAY[
        'hr_worksites',
        'hr_employee_profiles',
        'hr_employee_assignments',
        'hr_transport_lines',
        'hr_transport_vehicles',
        'hr_employee_transport_assignments',
        'hr_shift_templates',
        'hr_shift_plans',
        'hr_shift_assignments',
        'hr_leave_types',
        'hr_leave_balances',
        'hr_leave_requests',
        'hr_mission_requests',
        'hr_permission_allowances',
        'hr_penalty_types',
        'hr_penalty_records',
        'hr_workflow_definitions',
        'hr_workflow_steps',
        'hr_policy_definitions',
        'hr_salary_structures',
        'hr_employee_salary_terms',
        'hr_payroll_periods',
        'hr_payroll_runs',
        'hr_payroll_items',
        'ops_attendance_review_batches',
        'ops_attendance_events',
        'ops_attendance_adjustments',
        'hr_attendance_ledger'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_all_tables LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', v_table);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role;', v_table);
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_table);
        EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;', v_table);
        EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', v_table);
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- Backfill defaults and seed reference data
-- ------------------------------------------------------------
INSERT INTO public.hr_worksites (company_id, code, name, description, is_active, is_default)
SELECT
    c.id,
    'MAIN',
    'المكتب الرئيسي',
    'Default worksite seeded by HR foundation migration.',
    true,
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1
    FROM public.hr_worksites w
    WHERE w.company_id = c.id
      AND w.is_default = true
);

WITH resolved_company AS (
    SELECT
        ce.id AS employee_id,
        COALESCE(
            u.company_id,
            (SELECT s.main_company_id FROM public.settings s LIMIT 1),
            (SELECT c.id FROM public.companies c ORDER BY c.created_at NULLS LAST, c.id LIMIT 1)
        ) AS company_id,
        ce.employee_code,
        ce.department_id,
        ce.account_user_id,
        ce.is_active
    FROM public.company_employees ce
    LEFT JOIN public.users u
        ON u.id = ce.account_user_id
)
INSERT INTO public.hr_employee_profiles (
    company_id,
    employee_id,
    worker_type,
    original_employee_code,
    internal_employee_code,
    worksite_id,
    primary_department_id,
    employment_status,
    account_enabled
)
SELECT
    rc.company_id,
    rc.employee_id,
    'regular',
    rc.employee_code,
    rc.employee_code,
    (
        SELECT w.id
        FROM public.hr_worksites w
        WHERE w.company_id = rc.company_id
        ORDER BY w.is_default DESC, w.created_at
        LIMIT 1
    ) AS worksite_id,
    rc.department_id,
    CASE WHEN rc.is_active THEN 'active' ELSE 'inactive' END,
    rc.account_user_id IS NOT NULL
FROM resolved_company rc
WHERE rc.company_id IS NOT NULL
ON CONFLICT (employee_id) DO UPDATE
SET
    company_id = EXCLUDED.company_id,
    original_employee_code = COALESCE(public.hr_employee_profiles.original_employee_code, EXCLUDED.original_employee_code),
    internal_employee_code = COALESCE(public.hr_employee_profiles.internal_employee_code, EXCLUDED.internal_employee_code),
    worksite_id = COALESCE(public.hr_employee_profiles.worksite_id, EXCLUDED.worksite_id),
    primary_department_id = COALESCE(public.hr_employee_profiles.primary_department_id, EXCLUDED.primary_department_id),
    employment_status = EXCLUDED.employment_status,
    account_enabled = EXCLUDED.account_enabled;

INSERT INTO public.hr_employee_assignments (
    company_id,
    employee_profile_id,
    worksite_id,
    department_id,
    job_title_text,
    assignment_type,
    effective_from,
    is_current
)
SELECT
    hp.company_id,
    hp.id,
    hp.worksite_id,
    hp.primary_department_id,
    hp.job_title_text,
    'primary',
    COALESCE(hp.hire_date, current_date),
    true
FROM public.hr_employee_profiles hp
WHERE NOT EXISTS (
    SELECT 1
    FROM public.hr_employee_assignments a
    WHERE a.employee_profile_id = hp.id
      AND a.assignment_type = 'primary'
);

INSERT INTO public.hr_leave_types (company_id, code, name, is_paid, annual_allowance, is_active)
SELECT c.id, 'annual', 'إجازة سنوية', true, 21, true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_leave_types lt WHERE lt.company_id = c.id AND lt.code = 'annual'
)
UNION ALL
SELECT c.id, 'sick', 'إجازة مرضية', true, 14, true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_leave_types lt WHERE lt.company_id = c.id AND lt.code = 'sick'
)
UNION ALL
SELECT c.id, 'unpaid', 'إجازة بدون أجر', false, 0, true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_leave_types lt WHERE lt.company_id = c.id AND lt.code = 'unpaid'
);

INSERT INTO public.hr_penalty_types (company_id, code, name, is_deduction_based, default_amount, is_active)
SELECT c.id, 'delay', 'تأخير / خصم', true, 0, true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_penalty_types pt WHERE pt.company_id = c.id AND pt.code = 'delay'
)
UNION ALL
SELECT c.id, 'warning', 'إنذار', false, 0, true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_penalty_types pt WHERE pt.company_id = c.id AND pt.code = 'warning'
);

INSERT INTO public.hr_salary_structures (company_id, code, name, is_default, is_active, policy_snapshot)
SELECT
    c.id,
    'DEFAULT',
    'هيكل مرتب افتراضي',
    true,
    true,
    jsonb_build_object('currency', 'EGP', 'standard_work_minutes', 480)
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1
    FROM public.hr_salary_structures s
    WHERE s.company_id = c.id
      AND s.code = 'DEFAULT'
);

INSERT INTO public.hr_employee_salary_terms (
    company_id,
    employee_profile_id,
    salary_structure_id,
    base_salary,
    allowance_amount,
    fixed_deduction_amount,
    daily_rate,
    currency_code,
    effective_from,
    is_active
)
SELECT
    hp.company_id,
    hp.id,
    (
        SELECT s.id
        FROM public.hr_salary_structures s
        WHERE s.company_id = hp.company_id
        ORDER BY s.is_default DESC, s.created_at
        LIMIT 1
    ),
    0,
    0,
    0,
    0,
    'EGP',
    current_date,
    true
FROM public.hr_employee_profiles hp
WHERE NOT EXISTS (
    SELECT 1
    FROM public.hr_employee_salary_terms est
    WHERE est.employee_profile_id = hp.id
);

INSERT INTO public.hr_policy_definitions (
    company_id,
    code,
    name,
    policy_type,
    effective_from,
    is_active,
    config
)
SELECT
    c.id,
    'attendance_baseline',
    'ساعات العمل الأساسية',
    'attendance',
    current_date,
    true,
    jsonb_build_object('standard_work_minutes', 480, 'monthly_permission_minutes', 120)
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_policy_definitions p
    WHERE p.company_id = c.id AND p.code = 'attendance_baseline'
)
UNION ALL
SELECT
    c.id,
    'overtime_default',
    'سياسة الإضافي الافتراضية',
    'payroll',
    current_date,
    true,
    jsonb_build_object('overtime_multiplier', 1, 'holiday_overtime_multiplier', 2)
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_policy_definitions p
    WHERE p.company_id = c.id AND p.code = 'overtime_default'
);

INSERT INTO public.hr_workflow_definitions (company_id, code, name, entity_type, is_active, config)
SELECT c.id, 'leave_default', 'اعتماد طلب الإجازة', 'leave_request', true, '{}'::jsonb
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_workflow_definitions wf
    WHERE wf.company_id = c.id AND wf.code = 'leave_default'
)
UNION ALL
SELECT c.id, 'mission_default', 'اعتماد طلب المأمورية', 'mission_request', true, '{}'::jsonb
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_workflow_definitions wf
    WHERE wf.company_id = c.id AND wf.code = 'mission_default'
)
UNION ALL
SELECT c.id, 'penalty_default', 'اعتماد الجزاء', 'penalty_record', true, '{}'::jsonb
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_workflow_definitions wf
    WHERE wf.company_id = c.id AND wf.code = 'penalty_default'
);

INSERT INTO public.hr_workflow_steps (company_id, workflow_definition_id, step_order, role_code, action_code, is_required)
SELECT
    wf.company_id,
    wf.id,
    1,
    CASE
        WHEN wf.code = 'penalty_default' THEN 'hr_manager'
        ELSE 'admin'
    END,
    'approve',
    true
FROM public.hr_workflow_definitions wf
WHERE NOT EXISTS (
    SELECT 1 FROM public.hr_workflow_steps ws WHERE ws.workflow_definition_id = wf.id
);

INSERT INTO public.hr_permission_allowances (company_id, employee_profile_id, period_month, minutes_allowed, minutes_used)
SELECT
    hp.company_id,
    hp.id,
    date_trunc('month', current_date)::date,
    120,
    0
FROM public.hr_employee_profiles hp
WHERE hp.worker_type = 'regular'
  AND NOT EXISTS (
      SELECT 1
      FROM public.hr_permission_allowances pa
      WHERE pa.employee_profile_id = hp.id
        AND pa.period_month = date_trunc('month', current_date)::date
  );

-- ------------------------------------------------------------
-- Worker and integration helper functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hr_current_employee_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT hp.id
FROM public.hr_employee_profiles hp
JOIN public.company_employees ce
  ON ce.id = hp.employee_id
WHERE ce.account_user_id = auth.uid()
ORDER BY hp.created_at
LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.hr_is_current_worker_profile(p_employee_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT p_employee_profile_id IS NOT NULL
   AND p_employee_profile_id = public.hr_current_employee_profile_id();
$$;

CREATE OR REPLACE FUNCTION public.hr_publish_shift_plan(p_plan_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
    v_period_start date;
    v_period_end date;
BEGIN
    IF NOT public.hr_has_any_action(ARRAY['publish','approve','configure','edit']) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: missing HR publish permission';
    END IF;

    SELECT company_id, period_start, period_end
    INTO v_company_id, v_period_start, v_period_end
    FROM public.hr_shift_plans
    WHERE id = p_plan_id;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'SHIFT_PLAN_NOT_FOUND';
    END IF;

    UPDATE public.hr_shift_plans
    SET
        status = 'archived',
        updated_at = now(),
        updated_by = auth.uid()
    WHERE company_id = v_company_id
      AND id <> p_plan_id
      AND status = 'published'
      AND daterange(period_start, period_end, '[]') && daterange(v_period_start, v_period_end, '[]');

    UPDATE public.hr_shift_plans
    SET
        status = 'published',
        published_at = now(),
        published_by = auth.uid(),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_plan_id;

    RETURN p_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_get_active_shift_assignments(p_target_date date DEFAULT current_date)
RETURNS TABLE (
    shift_assignment_id uuid,
    employee_profile_id uuid,
    employee_name text,
    shift_plan_name text,
    shift_template_name text,
    work_date date,
    is_primary boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
    sa.id,
    sa.employee_profile_id,
    ce.name,
    sp.name,
    st.name,
    sa.work_date,
    sa.is_primary
FROM public.hr_shift_assignments sa
JOIN public.hr_shift_plans sp
  ON sp.id = sa.shift_plan_id
LEFT JOIN public.hr_shift_templates st
  ON st.id = sa.shift_template_id
JOIN public.hr_employee_profiles hp
  ON hp.id = sa.employee_profile_id
JOIN public.company_employees ce
  ON ce.id = hp.employee_id
WHERE sa.work_date = p_target_date
  AND sa.company_id = public.get_user_company_id()
  AND (
      public.hr_has_any_action(ARRAY['view','publish','configure'])
      OR public.production_has_any_action(ARRAY['view','attendance.capture','attendance.review'])
  )
ORDER BY ce.name;
$$;

CREATE OR REPLACE FUNCTION public.ops_submit_attendance_batch(p_review_batch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.production_has_any_action(ARRAY['attendance.capture','attendance.adjust','attendance.review']) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: missing production attendance submission permission';
    END IF;

    UPDATE public.ops_attendance_review_batches
    SET
        review_status = 'submitted',
        submitted_by = auth.uid(),
        submitted_at = now(),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_review_batch_id
      AND company_id = public.get_user_company_id();

    RETURN p_review_batch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_review_attendance_batch(
    p_review_batch_id uuid,
    p_review_status text,
    p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_review_status NOT IN ('in_review', 'approved', 'rejected', 'closed') THEN
        RAISE EXCEPTION 'INVALID_REVIEW_STATUS';
    END IF;

    IF NOT (
        public.production_has_any_action(ARRAY['attendance.review'])
        OR public.hr_has_any_action(ARRAY['approve','edit','configure'])
    ) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: missing attendance review permission';
    END IF;

    UPDATE public.ops_attendance_review_batches
    SET
        review_status = p_review_status,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        notes = COALESCE(p_notes, notes),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_review_batch_id
      AND company_id = public.get_user_company_id();

    RETURN p_review_batch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_build_attendance_ledger(p_payroll_period_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
    v_period_start date;
    v_period_end date;
    v_rows integer := 0;
BEGIN
    IF NOT public.hr_has_any_action(ARRAY['calculate','edit','approve','configure']) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: missing HR attendance ledger permission';
    END IF;

    SELECT company_id, period_start, period_end
    INTO v_company_id, v_period_start, v_period_end
    FROM public.hr_payroll_periods
    WHERE id = p_payroll_period_id;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'PAYROLL_PERIOD_NOT_FOUND';
    END IF;

    WITH upserted AS (
        INSERT INTO public.hr_attendance_ledger (
            company_id,
            payroll_period_id,
            employee_profile_id,
            source_event_id,
            work_date,
            attendance_status,
            worked_minutes,
            payable_minutes,
            overtime_minutes,
            deduction_minutes,
            notes,
            created_by,
            updated_by
        )
        SELECT
            e.company_id,
            p_payroll_period_id,
            e.employee_profile_id,
            e.id,
            e.event_date,
            e.attendance_status,
            CASE
                WHEN e.check_in_at IS NOT NULL
                THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(e.check_out_at, e.check_in_at) - e.check_in_at)) / 60)::integer)
                ELSE 0
            END AS worked_minutes,
            CASE
                WHEN e.attendance_status IN ('leave', 'mission', 'holiday') THEN 480
                WHEN e.attendance_status = 'absent' THEN 0
                WHEN e.check_in_at IS NOT NULL
                THEN LEAST(480, GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(e.check_out_at, e.check_in_at) - e.check_in_at)) / 60)::integer))
                ELSE 0
            END AS payable_minutes,
            CASE
                WHEN e.check_in_at IS NOT NULL
                THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(e.check_out_at, e.check_in_at) - e.check_in_at)) / 60)::integer - 480)
                ELSE 0
            END AS overtime_minutes,
            CASE
                WHEN e.attendance_status IN ('leave', 'mission', 'holiday') THEN 0
                WHEN e.attendance_status = 'absent' THEN 480
                WHEN e.check_in_at IS NOT NULL
                THEN GREATEST(0, 480 - LEAST(480, GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(e.check_out_at, e.check_in_at) - e.check_in_at)) / 60)::integer)))
                ELSE 480
            END AS deduction_minutes,
            e.notes,
            auth.uid(),
            auth.uid()
        FROM public.ops_attendance_events e
        JOIN public.ops_attendance_review_batches b
          ON b.id = e.review_batch_id
        WHERE e.company_id = v_company_id
          AND e.event_date BETWEEN v_period_start AND v_period_end
          AND b.review_status IN ('approved', 'closed')
        ON CONFLICT (payroll_period_id, source_event_id) DO UPDATE
        SET
            attendance_status = EXCLUDED.attendance_status,
            worked_minutes = EXCLUDED.worked_minutes,
            payable_minutes = EXCLUDED.payable_minutes,
            overtime_minutes = EXCLUDED.overtime_minutes,
            deduction_minutes = EXCLUDED.deduction_minutes,
            notes = EXCLUDED.notes,
            updated_at = now(),
            updated_by = auth.uid()
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_rows
    FROM upserted;

    RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_calculate_payroll_run(p_payroll_run_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
    v_period_id uuid;
    v_period_start date;
    v_period_end date;
    v_rows integer := 0;
    v_summary jsonb := '{}'::jsonb;
BEGIN
    IF NOT public.hr_has_any_action(ARRAY['calculate','approve','configure']) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: missing payroll calculation permission';
    END IF;

    SELECT r.company_id, r.payroll_period_id, p.period_start, p.period_end
    INTO v_company_id, v_period_id, v_period_start, v_period_end
    FROM public.hr_payroll_runs r
    JOIN public.hr_payroll_periods p
      ON p.id = r.payroll_period_id
    WHERE r.id = p_payroll_run_id;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'PAYROLL_RUN_NOT_FOUND';
    END IF;

    WITH latest_terms AS (
        SELECT DISTINCT ON (est.employee_profile_id)
            est.employee_profile_id,
            est.base_salary,
            est.allowance_amount,
            est.fixed_deduction_amount,
            est.daily_rate,
            est.currency_code
        FROM public.hr_employee_salary_terms est
        WHERE est.company_id = v_company_id
          AND est.is_active = true
          AND est.effective_from <= v_period_end
          AND (est.effective_to IS NULL OR est.effective_to >= v_period_start)
        ORDER BY est.employee_profile_id, est.effective_from DESC, est.created_at DESC
    ),
    ledger AS (
        SELECT
            l.employee_profile_id,
            COALESCE(SUM(l.payable_minutes), 0)::numeric / 480.0 AS payable_days,
            COALESCE(SUM(l.overtime_minutes), 0)::numeric / 60.0 AS overtime_hours,
            COALESCE(SUM(l.deduction_minutes), 0)::numeric AS deduction_minutes
        FROM public.hr_attendance_ledger l
        WHERE l.payroll_period_id = v_period_id
        GROUP BY l.employee_profile_id
    ),
    profiles AS (
        SELECT id AS employee_profile_id, worker_type
        FROM public.hr_employee_profiles
        WHERE company_id = v_company_id
          AND employment_status <> 'archived'
    ),
    computed AS (
        SELECT
            v_company_id AS company_id,
            p_payroll_run_id AS payroll_run_id,
            p.employee_profile_id,
            CASE
                WHEN p.worker_type = 'daily'
                THEN COALESCE(t.daily_rate, 0) * COALESCE(l.payable_days, 0)
                ELSE COALESCE(t.base_salary, 0)
            END AS base_salary,
            CASE
                WHEN p.worker_type = 'daily' THEN 0
                ELSE COALESCE(t.allowance_amount, 0)
            END AS allowance_amount,
            COALESCE(l.overtime_hours, 0) AS overtime_hours,
            (
                CASE
                    WHEN p.worker_type = 'daily'
                    THEN COALESCE(t.daily_rate, 0) / 8.0
                    ELSE COALESCE(t.base_salary, 0) / 30.0 / 8.0
                END
            ) * COALESCE(l.overtime_hours, 0) AS overtime_amount,
            COALESCE(t.fixed_deduction_amount, 0) +
            CASE
                WHEN p.worker_type = 'daily' THEN 0
                ELSE (COALESCE(t.base_salary, 0) / 30.0 / 8.0 / 60.0) * COALESCE(l.deduction_minutes, 0)
            END AS deduction_amount,
            jsonb_build_object(
                'payable_days', COALESCE(l.payable_days, 0),
                'deduction_minutes', COALESCE(l.deduction_minutes, 0),
                'currency_code', COALESCE(t.currency_code, 'EGP')
            ) AS details
        FROM profiles p
        LEFT JOIN latest_terms t
          ON t.employee_profile_id = p.employee_profile_id
        LEFT JOIN ledger l
          ON l.employee_profile_id = p.employee_profile_id
    ),
    upserted AS (
        INSERT INTO public.hr_payroll_items (
            company_id,
            payroll_run_id,
            employee_profile_id,
            base_salary,
            allowance_amount,
            deduction_amount,
            overtime_hours,
            overtime_amount,
            gross_amount,
            net_amount,
            details,
            created_by,
            updated_by
        )
        SELECT
            c.company_id,
            c.payroll_run_id,
            c.employee_profile_id,
            ROUND(c.base_salary, 2),
            ROUND(c.allowance_amount, 2),
            ROUND(c.deduction_amount, 2),
            ROUND(c.overtime_hours, 2),
            ROUND(c.overtime_amount, 2),
            ROUND(c.base_salary + c.allowance_amount + c.overtime_amount, 2),
            ROUND(c.base_salary + c.allowance_amount + c.overtime_amount - c.deduction_amount, 2),
            c.details,
            auth.uid(),
            auth.uid()
        FROM computed c
        ON CONFLICT (payroll_run_id, employee_profile_id) DO UPDATE
        SET
            base_salary = EXCLUDED.base_salary,
            allowance_amount = EXCLUDED.allowance_amount,
            deduction_amount = EXCLUDED.deduction_amount,
            overtime_hours = EXCLUDED.overtime_hours,
            overtime_amount = EXCLUDED.overtime_amount,
            gross_amount = EXCLUDED.gross_amount,
            net_amount = EXCLUDED.net_amount,
            details = EXCLUDED.details,
            updated_at = now(),
            updated_by = auth.uid()
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_rows
    FROM upserted;

    SELECT jsonb_build_object(
        'employees', COUNT(*),
        'gross_total', COALESCE(SUM(gross_amount), 0),
        'net_total', COALESCE(SUM(net_amount), 0)
    )
    INTO v_summary
    FROM public.hr_payroll_items
    WHERE payroll_run_id = p_payroll_run_id;

    UPDATE public.hr_payroll_runs
    SET
        run_status = 'calculated',
        calculated_at = now(),
        calculated_by = auth.uid(),
        summary = COALESCE(v_summary, '{}'::jsonb),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_payroll_run_id;

    RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_close_payroll_period(p_period_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.hr_has_any_action(ARRAY['close','approve','configure']) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: missing payroll close permission';
    END IF;

    UPDATE public.hr_payroll_periods
    SET
        status = 'closed',
        locked_at = now(),
        locked_by = auth.uid(),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_period_id
      AND company_id = public.get_user_company_id();

    UPDATE public.hr_payroll_runs
    SET
        run_status = 'closed',
        updated_at = now(),
        updated_by = auth.uid()
    WHERE payroll_period_id = p_period_id
      AND company_id = public.get_user_company_id();

    RETURN p_period_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_get_employee_month_summary(
    p_employee_profile_id uuid,
    p_period_start date,
    p_period_end date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id uuid := COALESCE(p_employee_profile_id, public.hr_current_employee_profile_id());
    v_payload jsonb;
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('employee_profile_id', NULL);
    END IF;

    IF NOT public.hr_has_any_action(ARRAY['view','export','calculate','approve'])
       AND NOT public.hr_is_current_worker_profile(v_profile_id) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: cannot access another employee summary';
    END IF;

    WITH ledger_summary AS (
        SELECT
            COUNT(*) FILTER (WHERE attendance_status = 'present') AS present_days,
            COUNT(*) FILTER (WHERE attendance_status = 'absent') AS absent_days,
            COUNT(*) FILTER (WHERE attendance_status = 'leave') AS leave_days,
            COUNT(*) FILTER (WHERE attendance_status = 'mission') AS mission_days,
            COALESCE(SUM(worked_minutes), 0) AS worked_minutes,
            COALESCE(SUM(payable_minutes), 0) AS payable_minutes,
            COALESCE(SUM(overtime_minutes), 0) AS overtime_minutes,
            COALESCE(SUM(deduction_minutes), 0) AS deduction_minutes
        FROM public.hr_attendance_ledger
        WHERE employee_profile_id = v_profile_id
          AND work_date BETWEEN p_period_start AND p_period_end
    ),
    payroll_summary AS (
        SELECT
            pi.base_salary,
            pi.allowance_amount,
            pi.deduction_amount,
            pi.overtime_hours,
            pi.overtime_amount,
            pi.gross_amount,
            pi.net_amount
        FROM public.hr_payroll_items pi
        JOIN public.hr_payroll_runs pr
          ON pr.id = pi.payroll_run_id
        JOIN public.hr_payroll_periods pp
          ON pp.id = pr.payroll_period_id
        WHERE pi.employee_profile_id = v_profile_id
          AND pp.period_start = p_period_start
          AND pp.period_end = p_period_end
        ORDER BY pr.created_at DESC
        LIMIT 1
    )
    SELECT jsonb_build_object(
        'employee_profile_id', v_profile_id,
        'period_start', p_period_start,
        'period_end', p_period_end,
        'attendance', jsonb_build_object(
            'present_days', COALESCE(ls.present_days, 0),
            'absent_days', COALESCE(ls.absent_days, 0),
            'leave_days', COALESCE(ls.leave_days, 0),
            'mission_days', COALESCE(ls.mission_days, 0),
            'worked_minutes', COALESCE(ls.worked_minutes, 0),
            'payable_minutes', COALESCE(ls.payable_minutes, 0),
            'overtime_minutes', COALESCE(ls.overtime_minutes, 0),
            'deduction_minutes', COALESCE(ls.deduction_minutes, 0)
        ),
        'payroll', COALESCE(
            (
                SELECT jsonb_build_object(
                    'base_salary', ps.base_salary,
                    'allowance_amount', ps.allowance_amount,
                    'deduction_amount', ps.deduction_amount,
                    'overtime_hours', ps.overtime_hours,
                    'overtime_amount', ps.overtime_amount,
                    'gross_amount', ps.gross_amount,
                    'net_amount', ps.net_amount
                )
                FROM payroll_summary ps
            ),
            '{}'::jsonb
        )
    )
    INTO v_payload
    FROM ledger_summary ls;

    RETURN COALESCE(v_payload, jsonb_build_object('employee_profile_id', v_profile_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_get_my_worker_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id uuid := public.hr_current_employee_profile_id();
    v_payload jsonb;
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('employee_profile_id', NULL);
    END IF;

    SELECT jsonb_build_object(
        'employee_profile_id', hp.id,
        'employee_name', ce.name,
        'employee_code', hp.internal_employee_code,
        'original_employee_code', hp.original_employee_code,
        'worker_type', hp.worker_type,
        'employment_status', hp.employment_status,
        'worksite_name', ws.name,
        'department_id', hp.primary_department_id,
        'current_shift', COALESCE(
            (
                SELECT jsonb_build_object(
                    'work_date', sa.work_date,
                    'shift_plan', sp.name,
                    'shift_template', st.name
                )
                FROM public.hr_shift_assignments sa
                JOIN public.hr_shift_plans sp
                  ON sp.id = sa.shift_plan_id
                LEFT JOIN public.hr_shift_templates st
                  ON st.id = sa.shift_template_id
                WHERE sa.employee_profile_id = hp.id
                  AND sa.work_date >= current_date
                ORDER BY sa.work_date
                LIMIT 1
            ),
            '{}'::jsonb
        ),
        'leave_balances', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'leave_type', lt.name,
                        'period_year', lb.period_year,
                        'closing_balance', lb.closing_balance
                    )
                    ORDER BY lb.period_year DESC, lt.name
                )
                FROM public.hr_leave_balances lb
                JOIN public.hr_leave_types lt
                  ON lt.id = lb.leave_type_id
                WHERE lb.employee_profile_id = hp.id
            ),
            '[]'::jsonb
        )
    )
    INTO v_payload
    FROM public.hr_employee_profiles hp
    JOIN public.company_employees ce
      ON ce.id = hp.employee_id
    LEFT JOIN public.hr_worksites ws
      ON ws.id = hp.worksite_id
    WHERE hp.id = v_profile_id;

    RETURN COALESCE(v_payload, jsonb_build_object('employee_profile_id', v_profile_id));
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_has_any_action(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.production_has_any_action(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hr_current_employee_profile_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hr_is_current_worker_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hr_publish_shift_plan(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hr_get_active_shift_assignments(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ops_submit_attendance_batch(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ops_review_attendance_batch(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hr_build_attendance_ledger(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hr_calculate_payroll_run(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hr_close_payroll_period(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hr_get_employee_month_summary(uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hr_get_my_worker_snapshot() TO authenticated, service_role;

-- ------------------------------------------------------------
-- Monthly summary view
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.hr_employee_month_summary
WITH (security_invoker = true)
AS
SELECT
    l.company_id,
    l.employee_profile_id,
    date_trunc('month', l.work_date)::date AS month_start,
    COUNT(*) FILTER (WHERE l.attendance_status = 'present') AS present_days,
    COUNT(*) FILTER (WHERE l.attendance_status = 'absent') AS absent_days,
    COUNT(*) FILTER (WHERE l.attendance_status = 'leave') AS leave_days,
    COUNT(*) FILTER (WHERE l.attendance_status = 'mission') AS mission_days,
    COALESCE(SUM(l.worked_minutes), 0) AS worked_minutes,
    COALESCE(SUM(l.payable_minutes), 0) AS payable_minutes,
    COALESCE(SUM(l.overtime_minutes), 0) AS overtime_minutes,
    COALESCE(SUM(l.deduction_minutes), 0) AS deduction_minutes
FROM public.hr_attendance_ledger l
GROUP BY
    l.company_id,
    l.employee_profile_id,
    date_trunc('month', l.work_date)::date;

GRANT SELECT ON public.hr_employee_month_summary TO authenticated, service_role;

-- ------------------------------------------------------------
-- RLS policies
-- ------------------------------------------------------------
DO $$
DECLARE
    v_table text;
    v_hr_tables text[] := ARRAY[
        'hr_worksites',
        'hr_employee_profiles',
        'hr_employee_assignments',
        'hr_transport_lines',
        'hr_transport_vehicles',
        'hr_employee_transport_assignments',
        'hr_shift_templates',
        'hr_shift_plans',
        'hr_shift_assignments',
        'hr_leave_types',
        'hr_leave_balances',
        'hr_leave_requests',
        'hr_mission_requests',
        'hr_permission_allowances',
        'hr_penalty_types',
        'hr_penalty_records',
        'hr_workflow_definitions',
        'hr_workflow_steps',
        'hr_policy_definitions',
        'hr_salary_structures',
        'hr_employee_salary_terms',
        'hr_payroll_periods',
        'hr_payroll_runs',
        'hr_payroll_items',
        'hr_attendance_ledger'
    ];
    v_ops_tables text[] := ARRAY[
        'ops_attendance_review_batches',
        'ops_attendance_events',
        'ops_attendance_adjustments'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_hr_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_service_role" ON public.%1$I;', v_table);
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_hr_select" ON public.%1$I;', v_table);
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_hr_insert" ON public.%1$I;', v_table);
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_hr_update" ON public.%1$I;', v_table);
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_hr_delete" ON public.%1$I;', v_table);

        EXECUTE format('CREATE POLICY "%1$s_service_role" ON public.%1$I FOR ALL TO service_role USING (true) WITH CHECK (true);', v_table);
        EXECUTE format(
            'CREATE POLICY "%1$s_hr_select" ON public.%1$I FOR SELECT TO authenticated USING (company_id = public.get_user_company_id() AND public.hr_has_any_action(ARRAY[''view'',''edit'',''approve'',''configure'',''calculate'',''close'',''publish'',''export'']));',
            v_table
        );
        EXECUTE format(
            'CREATE POLICY "%1$s_hr_insert" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.hr_has_any_action(ARRAY[''create'',''edit'',''configure'']));',
            v_table
        );
        EXECUTE format(
            'CREATE POLICY "%1$s_hr_update" ON public.%1$I FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.hr_has_any_action(ARRAY[''edit'',''approve'',''configure'',''calculate'',''close'',''publish''])) WITH CHECK (company_id = public.get_user_company_id() AND public.hr_has_any_action(ARRAY[''edit'',''approve'',''configure'',''calculate'',''close'',''publish'']));',
            v_table
        );
        EXECUTE format(
            'CREATE POLICY "%1$s_hr_delete" ON public.%1$I FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.hr_has_any_action(ARRAY[''archive'',''configure'']));',
            v_table
        );
    END LOOP;

    FOREACH v_table IN ARRAY v_ops_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_service_role" ON public.%1$I;', v_table);
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_ops_select" ON public.%1$I;', v_table);
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_ops_insert" ON public.%1$I;', v_table);
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_ops_update" ON public.%1$I;', v_table);
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_ops_delete" ON public.%1$I;', v_table);

        EXECUTE format('CREATE POLICY "%1$s_service_role" ON public.%1$I FOR ALL TO service_role USING (true) WITH CHECK (true);', v_table);
        EXECUTE format(
            'CREATE POLICY "%1$s_ops_select" ON public.%1$I FOR SELECT TO authenticated USING (company_id = public.get_user_company_id() AND (public.production_has_any_action(ARRAY[''view'',''attendance.capture'',''attendance.adjust'',''attendance.review'']) OR public.hr_has_any_action(ARRAY[''view'',''edit'',''approve'',''configure'',''calculate''])));',
            v_table
        );
        EXECUTE format(
            'CREATE POLICY "%1$s_ops_insert" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.production_has_any_action(ARRAY[''create'',''attendance.capture'',''attendance.adjust'']));',
            v_table
        );
        EXECUTE format(
            'CREATE POLICY "%1$s_ops_update" ON public.%1$I FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND (public.production_has_any_action(ARRAY[''attendance.adjust'',''attendance.review'']) OR public.hr_has_any_action(ARRAY[''edit'',''approve'',''configure'']))) WITH CHECK (company_id = public.get_user_company_id() AND (public.production_has_any_action(ARRAY[''attendance.adjust'',''attendance.review'']) OR public.hr_has_any_action(ARRAY[''edit'',''approve'',''configure''])));',
            v_table
        );
        EXECUTE format(
            'CREATE POLICY "%1$s_ops_delete" ON public.%1$I FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND (public.production_has_any_action(ARRAY[''attendance.review'']) OR public.hr_has_any_action(ARRAY[''configure''])));',
            v_table
        );
    END LOOP;
END $$;

DROP POLICY IF EXISTS "hr_employee_profiles_worker_select" ON public.hr_employee_profiles;
CREATE POLICY "hr_employee_profiles_worker_select"
ON public.hr_employee_profiles
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.hr_is_current_worker_profile(id)
);

DROP POLICY IF EXISTS "hr_leave_balances_worker_select" ON public.hr_leave_balances;
CREATE POLICY "hr_leave_balances_worker_select"
ON public.hr_leave_balances
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.hr_is_current_worker_profile(employee_profile_id)
);

DROP POLICY IF EXISTS "hr_leave_requests_worker_select" ON public.hr_leave_requests;
CREATE POLICY "hr_leave_requests_worker_select"
ON public.hr_leave_requests
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.hr_is_current_worker_profile(employee_profile_id)
);

DROP POLICY IF EXISTS "hr_mission_requests_worker_select" ON public.hr_mission_requests;
CREATE POLICY "hr_mission_requests_worker_select"
ON public.hr_mission_requests
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.hr_is_current_worker_profile(employee_profile_id)
);

DROP POLICY IF EXISTS "hr_permission_allowances_worker_select" ON public.hr_permission_allowances;
CREATE POLICY "hr_permission_allowances_worker_select"
ON public.hr_permission_allowances
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.hr_is_current_worker_profile(employee_profile_id)
);

DROP POLICY IF EXISTS "hr_shift_assignments_worker_select" ON public.hr_shift_assignments;
CREATE POLICY "hr_shift_assignments_worker_select"
ON public.hr_shift_assignments
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.hr_is_current_worker_profile(employee_profile_id)
);

DROP POLICY IF EXISTS "hr_attendance_ledger_worker_select" ON public.hr_attendance_ledger;
CREATE POLICY "hr_attendance_ledger_worker_select"
ON public.hr_attendance_ledger
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.hr_is_current_worker_profile(employee_profile_id)
);

DROP POLICY IF EXISTS "hr_payroll_items_worker_select" ON public.hr_payroll_items;
CREATE POLICY "hr_payroll_items_worker_select"
ON public.hr_payroll_items
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.hr_is_current_worker_profile(employee_profile_id)
);

SET app.bypass_permission_check = 'off';

COMMIT;
