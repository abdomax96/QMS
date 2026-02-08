-- Fix Departments API Errors
-- Enable RLS and set permissive policies for departments table
-- Enable RLS on departments table
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_authenticated" ON public.departments;
DROP POLICY IF EXISTS "departments_update_authenticated" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_authenticated" ON public.departments;
-- Allow authenticated users to read departments
CREATE POLICY "departments_select_authenticated" ON public.departments FOR
SELECT TO authenticated USING (true);
-- Allow authenticated users to insert departments
CREATE POLICY "departments_insert_authenticated" ON public.departments FOR
INSERT TO authenticated WITH CHECK (true);
-- Allow authenticated users to update departments
CREATE POLICY "departments_update_authenticated" ON public.departments FOR
UPDATE TO authenticated USING (true) WITH CHECK (true);
-- Allow authenticated users to delete departments
CREATE POLICY "departments_delete_authenticated" ON public.departments FOR DELETE TO authenticated USING (true);