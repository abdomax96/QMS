-- Migration: company employees directory with optional account linkage
-- Purpose:
--   1) Store all company employees (with/without app accounts).
--   2) Link employees to existing user accounts when available.
--   3) Enable admin-managed employee lifecycle with RLS.
-- Date: 2026-02-24

BEGIN;

CREATE TABLE IF NOT EXISTS public.company_employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code text NOT NULL,
    name text NOT NULL,
    email text,
    department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    default_role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
    account_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT company_employees_employee_code_not_empty CHECK (btrim(employee_code) <> ''),
    CONSTRAINT company_employees_name_not_empty CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS company_employees_employee_code_key
    ON public.company_employees (lower(employee_code));

CREATE UNIQUE INDEX IF NOT EXISTS company_employees_email_key
    ON public.company_employees (lower(email))
    WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS company_employees_account_user_id_key
    ON public.company_employees (account_user_id)
    WHERE account_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_employees_department_id
    ON public.company_employees(department_id);

ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_employees_select_policy" ON public.company_employees;
CREATE POLICY "company_employees_select_policy"
ON public.company_employees
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "company_employees_modify_policy" ON public.company_employees;
CREATE POLICY "company_employees_modify_policy"
ON public.company_employees
FOR ALL TO authenticated
USING (
    public.is_admin_user()
    OR NOT public.has_any_admin()
)
WITH CHECK (
    public.is_admin_user()
    OR NOT public.has_any_admin()
);

CREATE OR REPLACE FUNCTION public.touch_company_employees_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at := now();
    IF NEW.updated_by IS NULL THEN
        NEW.updated_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_employees_touch_updated_at ON public.company_employees;
CREATE TRIGGER trg_company_employees_touch_updated_at
BEFORE UPDATE ON public.company_employees
FOR EACH ROW
EXECUTE FUNCTION public.touch_company_employees_updated_at();

INSERT INTO public.company_employees (
    employee_code,
    name,
    email,
    department_id,
    default_role_id,
    account_user_id,
    is_active,
    created_at,
    updated_at,
    created_by,
    updated_by
)
SELECT
    'EMP-' || upper(substring(replace(u.id::text, '-', '') FROM 1 FOR 10)) AS employee_code,
    COALESCE(NULLIF(btrim(u.name), ''), split_part(u.email, '@', 1), 'Employee') AS name,
    u.email,
    u.department_id,
    (
        SELECT ur.role_id
        FROM public.user_roles ur
        WHERE ur.user_id = u.id
        ORDER BY ur.assigned_at NULLS LAST
        LIMIT 1
    ) AS default_role_id,
    u.id AS account_user_id,
    COALESCE(u.is_active, true) AS is_active,
    COALESCE(u.created_at, now()) AS created_at,
    COALESCE(u.updated_at, now()) AS updated_at,
    u.id AS created_by,
    u.id AS updated_by
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1
    FROM public.company_employees ce
    WHERE ce.account_user_id = u.id
       OR (
            ce.email IS NOT NULL
            AND u.email IS NOT NULL
            AND lower(ce.email) = lower(u.email)
       )
);

COMMENT ON TABLE public.company_employees IS
'Company employee directory with optional linkage to app user accounts.';

COMMENT ON COLUMN public.company_employees.account_user_id IS
'Linked app account in public.users; null means employee has no account yet.';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_employees TO authenticated;
GRANT ALL ON TABLE public.company_employees TO service_role;

COMMIT;
