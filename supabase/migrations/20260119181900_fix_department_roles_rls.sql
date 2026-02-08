-- Fix infinite recursion and add bootstrap bypass to permission triggers
-- Step 1: Create SECURITY DEFINER functions to check admin status without RLS
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid DEFAULT auth.uid()) RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = check_user_id
            AND r.code IN ('super_admin', 'admin')
    );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;
-- Step 2: Create function to check if any admin exists (for bootstrap)
DROP FUNCTION IF EXISTS public.has_any_admin();
CREATE OR REPLACE FUNCTION public.has_any_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
        WHERE r.code IN ('super_admin', 'admin')
    );
$$;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;
-- Step 3: Update validate_user_roles_change to allow bootstrap
CREATE OR REPLACE FUNCTION public.validate_user_roles_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE v_user_email TEXT;
v_user_roles TEXT [];
v_has_permission BOOLEAN;
v_affected_user_email TEXT;
v_assigned_role_name TEXT;
v_has_any_admin BOOLEAN;
BEGIN -- Check if ANY admin exists - if not, allow bootstrap
SELECT public.has_any_admin() INTO v_has_any_admin;
-- Allow operation if in bootstrap mode (no admins exist)
IF NOT v_has_any_admin THEN RETURN COALESCE(NEW, OLD);
END IF;
-- Normal permission check
v_has_permission := check_matrix_permission(auth.uid(), 'settings', 'manage_permissions');
IF NOT v_has_permission THEN
SELECT email INTO v_user_email
FROM users
WHERE id = auth.uid();
SELECT ARRAY_AGG(r.name) INTO v_user_roles
FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = auth.uid();
SELECT email INTO v_affected_user_email
FROM users
WHERE id = COALESCE(NEW.user_id, OLD.user_id);
SELECT name INTO v_assigned_role_name
FROM roles
WHERE id = COALESCE(NEW.role_id, OLD.role_id);
RAISE EXCEPTION 'PERMISSION_DENIED: Cannot assign role "%" to user "%". User "%" with roles [%] does not have "settings.manage_permissions" in the Permission Matrix.',
v_assigned_role_name,
v_affected_user_email,
COALESCE(v_user_email, 'unknown'),
COALESCE(array_to_string(v_user_roles, ', '), 'none') USING ERRCODE = 'insufficient_privilege';
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$;
-- Step 4: Fix RLS policies using the SECURITY DEFINER functions
-- user_roles
DROP POLICY IF EXISTS "user_roles_modify_policy" ON "public"."user_roles";
DROP POLICY IF EXISTS "user_roles_select_policy" ON "public"."user_roles";
CREATE POLICY "user_roles_select_policy" ON "public"."user_roles" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "user_roles_modify_policy" ON "public"."user_roles" FOR ALL TO "authenticated" USING (
    public.is_admin_user()
    OR NOT public.has_any_admin()
) WITH CHECK (
    public.is_admin_user()
    OR NOT public.has_any_admin()
);
-- department_roles
DROP POLICY IF EXISTS "department_roles_modify_policy" ON "public"."department_roles";
DROP POLICY IF EXISTS "department_roles_select_policy" ON "public"."department_roles";
CREATE POLICY "department_roles_select_policy" ON "public"."department_roles" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "department_roles_modify_policy" ON "public"."department_roles" FOR ALL TO "authenticated" USING (
    public.is_admin_user()
    OR NOT public.has_any_admin()
) WITH CHECK (
    public.is_admin_user()
    OR NOT public.has_any_admin()
);
-- users
DROP POLICY IF EXISTS "users_select_policy" ON "public"."users";
DROP POLICY IF EXISTS "users_modify_policy" ON "public"."users";
CREATE POLICY "users_select_policy" ON "public"."users" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "users_modify_policy" ON "public"."users" FOR ALL TO "authenticated" USING (
    id = auth.uid()
    OR public.is_admin_user()
    OR NOT public.has_any_admin()
) WITH CHECK (
    id = auth.uid()
    OR public.is_admin_user()
    OR NOT public.has_any_admin()
);
-- departments
DROP POLICY IF EXISTS "departments_modify_policy" ON "public"."departments";
DROP POLICY IF EXISTS "departments_select_policy" ON "public"."departments";
CREATE POLICY "departments_select_policy" ON "public"."departments" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "departments_modify_policy" ON "public"."departments" FOR ALL TO "authenticated" USING (
    public.is_admin_user()
    OR NOT public.has_any_admin()
) WITH CHECK (
    public.is_admin_user()
    OR NOT public.has_any_admin()
);
-- app_modules
DROP POLICY IF EXISTS "app_modules_select_policy" ON "public"."app_modules";
DROP POLICY IF EXISTS "app_modules_modify_policy" ON "public"."app_modules";
CREATE POLICY "app_modules_select_policy" ON "public"."app_modules" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "app_modules_modify_policy" ON "public"."app_modules" FOR ALL TO "authenticated" USING (
    public.is_admin_user()
    OR NOT public.has_any_admin()
) WITH CHECK (
    public.is_admin_user()
    OR NOT public.has_any_admin()
);
-- ncr_stage_permissions
DROP POLICY IF EXISTS "ncr_stage_permissions_select_policy" ON "public"."ncr_stage_permissions";
DROP POLICY IF EXISTS "ncr_stage_permissions_modify_policy" ON "public"."ncr_stage_permissions";
CREATE POLICY "ncr_stage_permissions_select_policy" ON "public"."ncr_stage_permissions" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "ncr_stage_permissions_modify_policy" ON "public"."ncr_stage_permissions" FOR ALL TO "authenticated" USING (
    public.is_admin_user()
    OR NOT public.has_any_admin()
) WITH CHECK (
    public.is_admin_user()
    OR NOT public.has_any_admin()
);
-- user_departments
DROP POLICY IF EXISTS "user_departments_select_policy" ON "public"."user_departments";
DROP POLICY IF EXISTS "user_departments_modify_policy" ON "public"."user_departments";
CREATE POLICY "user_departments_select_policy" ON "public"."user_departments" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "user_departments_modify_policy" ON "public"."user_departments" FOR ALL TO "authenticated" USING (
    user_id = auth.uid()
    OR public.is_admin_user()
    OR NOT public.has_any_admin()
) WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin_user()
    OR NOT public.has_any_admin()
);
COMMENT ON FUNCTION public.is_admin_user(uuid) IS 'SECURITY DEFINER function to check if user is admin. Bypasses RLS to avoid infinite recursion.';
COMMENT ON FUNCTION public.has_any_admin() IS 'SECURITY DEFINER function to check if any admin exists. Used for bootstrap mode.';