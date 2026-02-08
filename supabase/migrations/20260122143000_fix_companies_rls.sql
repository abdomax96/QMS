-- Allow anon users to view active companies (required for login/signup pages)
DROP POLICY IF EXISTS "Anon can view active companies" ON "public"."companies";
CREATE POLICY "Anon can view active companies" ON "public"."companies" FOR
SELECT TO anon USING (is_active = true);
-- Ensure authenticated users can also view companies
DROP POLICY IF EXISTS "Authenticated users can view companies" ON "public"."companies";
CREATE POLICY "Authenticated users can view companies" ON "public"."companies" FOR
SELECT TO authenticated USING (true);
