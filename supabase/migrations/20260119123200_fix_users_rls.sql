-- Fix users table RLS policies
-- This migration fixes the "Cannot coerce the result to a single JSON object" error
-- 1. Check for duplicate users first (diagnostic only - view results in output)
-- Uncomment this to check:
-- SELECT id, email, COUNT(*) as count FROM users GROUP BY id, email HAVING COUNT(*) > 1;
-- 2. Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "users_select_own" ON "public"."users";
DROP POLICY IF EXISTS "users_select_all_for_admins" ON "public"."users";
-- 3. Enable RLS on users table (in case it wasn't enabled)
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
-- 4. Create policy for users to read their own profile
CREATE POLICY "users_select_own" ON "public"."users" FOR
SELECT TO authenticated USING (auth.uid() = id);
-- 5. Create policy for admins to see all users
CREATE POLICY "users_select_all_for_admins" ON "public"."users" FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
                AND r.code IN ('super_admin', 'admin')
        )
    );