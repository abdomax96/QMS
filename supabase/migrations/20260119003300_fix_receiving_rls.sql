-- Migration: Add RLS Policies for Material Receiving
-- إصلاح سياسات الأمان لجدول الاستلامات material_receiving
-- Enable RLS (ensure it is on)
ALTER TABLE public.material_receiving ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.material_receiving;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.material_receiving;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.material_receiving;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.material_receiving;
-- Create full access policies for authenticated users
-- في بيئة الإنتاج يفضل تقييد هذا حسب الشركة، لكن حالياً لنسرع العمل سنسمح للمستخدمين المسجلين
CREATE POLICY "Enable read access for authenticated users" ON public.material_receiving FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.material_receiving FOR
INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.material_receiving FOR
UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for authenticated users" ON public.material_receiving FOR DELETE TO authenticated USING (true);
DO $$ BEGIN RAISE NOTICE 'تم تفعيل سياسات الأمان لجدول الاستلامات بنجاح';
END $$;