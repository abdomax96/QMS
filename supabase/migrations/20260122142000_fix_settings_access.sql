-- Ensure global settings row exists
INSERT INTO public.settings (id)
VALUES ('global') ON CONFLICT (id) DO NOTHING;
-- Allow anon (unauthenticated) users to read the global settings
-- This is required for the login page to fetch company configuration
CREATE POLICY "Anon can view global settings" ON public.settings FOR
SELECT TO anon USING (id = 'global');
-- Ensure authenticated users can also view it (redundant if covered, but safe)
CREATE POLICY "Authenticated users can view global settings" ON public.settings FOR
SELECT TO authenticated USING (id = 'global');
