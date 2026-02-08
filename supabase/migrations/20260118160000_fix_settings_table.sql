-- Fix Settings API Errors
-- 1. Insert default 'global' settings row if missing (fixes 406)
-- 2. Enable RLS and set permissive policies (fixes 400)
-- Insert default global settings row
INSERT INTO public.settings (id)
VALUES ('global') ON CONFLICT (id) DO NOTHING;
-- Enable RLS on settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_update_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_authenticated" ON public.settings;
-- Allow authenticated users to read settings
CREATE POLICY "settings_select_authenticated" ON public.settings FOR
SELECT TO authenticated USING (true);
-- Allow authenticated users to insert settings
CREATE POLICY "settings_insert_authenticated" ON public.settings FOR
INSERT TO authenticated WITH CHECK (true);
-- Allow authenticated users to update settings
CREATE POLICY "settings_update_authenticated" ON public.settings FOR
UPDATE TO authenticated USING (true) WITH CHECK (true);
-- Allow authenticated users to delete settings
CREATE POLICY "settings_delete_authenticated" ON public.settings FOR DELETE TO authenticated USING (true);