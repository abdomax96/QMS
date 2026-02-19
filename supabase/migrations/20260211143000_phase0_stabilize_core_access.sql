-- Migration: Phase 0 stabilization for core access policies
-- Date: 2026-02-11
-- Why:
--   Production/clone flows can end in permission regressions (403) on core bootstrap tables
--   such as settings/users/user_roles, which blocks login context and module permissions.
-- What this migration does:
--   1) Rebuilds stable helper functions for admin checks.
--   2) Re-applies baseline grants for anon/authenticated/service_role.
--   3) Recreates stable RLS policies for core tables used during app bootstrap.

-- Stable helper functions (SECURITY DEFINER) used by policies.
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid DEFAULT auth.uid()) RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = check_user_id
            AND r.code IN ('super_admin', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.has_any_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
        WHERE r.code IN ('super_admin', 'admin')
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;

-- Baseline grants for API roles.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Ensure global settings row for login page bootstrap.
-- Use NOT EXISTS instead of ON CONFLICT because some legacy environments
-- may miss a unique constraint on settings.id.
INSERT INTO public.settings (id)
SELECT 'global'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.settings
  WHERE id = 'global'
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

-- settings policies
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_update_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_authenticated" ON public.settings;
DROP POLICY IF EXISTS "Anon can view global settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can view global settings" ON public.settings;
DROP POLICY IF EXISTS "settings_modify_policy" ON public.settings;

CREATE POLICY "Anon can view global settings" ON public.settings
FOR SELECT TO anon
USING (id = 'global');

CREATE POLICY "Authenticated users can view global settings" ON public.settings
FOR SELECT TO authenticated
USING (id = 'global');

CREATE POLICY "settings_modify_policy" ON public.settings
FOR ALL TO authenticated
USING (public.is_admin_user() OR NOT public.has_any_admin())
WITH CHECK (public.is_admin_user() OR NOT public.has_any_admin());

-- users policies
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_modify_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_all_for_admins" ON public.users;
DROP POLICY IF EXISTS "users_modify_admin" ON public.users;
DROP POLICY IF EXISTS "users_modify_own" ON public.users;
DROP POLICY IF EXISTS "users_select_all" ON public.users;

CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "users_modify_policy" ON public.users
FOR ALL TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin_user()
  OR NOT public.has_any_admin()
)
WITH CHECK (
  id = auth.uid()
  OR public.is_admin_user()
  OR NOT public.has_any_admin()
);

-- user_roles policies
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_modify_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_modify_admin" ON public.user_roles;

CREATE POLICY "user_roles_select_policy" ON public.user_roles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "user_roles_modify_policy" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.is_admin_user()
  OR NOT public.has_any_admin()
)
WITH CHECK (
  public.is_admin_user()
  OR NOT public.has_any_admin()
);

-- user_departments policies
DROP POLICY IF EXISTS "user_departments_select_policy" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_modify_policy" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_select_all" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_modify_admin" ON public.user_departments;

CREATE POLICY "user_departments_select_policy" ON public.user_departments
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "user_departments_modify_policy" ON public.user_departments
FOR ALL TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_user()
  OR NOT public.has_any_admin()
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin_user()
  OR NOT public.has_any_admin()
);

-- module/role matrix read policies needed during permission bootstrap.
DROP POLICY IF EXISTS "app_modules_select_policy" ON public.app_modules;
CREATE POLICY "app_modules_select_policy" ON public.app_modules
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "roles_select_policy" ON public.roles;
CREATE POLICY "roles_select_policy" ON public.roles
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "role_module_permissions_select_policy" ON public.role_module_permissions;
CREATE POLICY "role_module_permissions_select_policy" ON public.role_module_permissions
FOR SELECT TO authenticated
USING (true);
