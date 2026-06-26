-- Migration: Allow admin cross-company access for material_receiving while keeping company isolation for normal users
-- Date: 2026-04-21
-- Context: UI supports selecting a company for Lab -> Material Receiving; selection should not require changing settings.main_company_id.
--          We keep tenant isolation for regular users (company_id = get_user_company_id()) and allow admins/super_admins to operate across companies.

BEGIN;

ALTER TABLE public.material_receiving ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_receiving_select_authenticated" ON public.material_receiving;
DROP POLICY IF EXISTS "material_receiving_insert_authenticated" ON public.material_receiving;
DROP POLICY IF EXISTS "material_receiving_update_authenticated" ON public.material_receiving;
DROP POLICY IF EXISTS "material_receiving_delete_authenticated" ON public.material_receiving;

CREATE POLICY "material_receiving_select_authenticated"
ON public.material_receiving
FOR SELECT
TO authenticated
USING (
  (
    public.can_access_module(auth.uid(), 'material_receiving', 'view')
    OR public.can_access_module(auth.uid(), 'lab', 'view')
  )
  AND (
    company_id = public.get_user_company_id()
    OR public.is_admin_or_super_admin()
  )
);

CREATE POLICY "material_receiving_insert_authenticated"
ON public.material_receiving
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.can_access_module(auth.uid(), 'material_receiving', 'create')
    OR public.can_access_module(auth.uid(), 'material_receiving', 'edit')
    OR public.can_access_module(auth.uid(), 'lab', 'create')
    OR public.can_access_module(auth.uid(), 'lab', 'edit')
  )
  AND company_id IS NOT NULL
  AND (
    company_id = public.get_user_company_id()
    OR public.is_admin_or_super_admin()
  )
);

CREATE POLICY "material_receiving_update_authenticated"
ON public.material_receiving
FOR UPDATE
TO authenticated
USING (
  (
    public.can_access_module(auth.uid(), 'material_receiving', 'edit')
    OR public.can_access_module(auth.uid(), 'lab', 'edit')
  )
  AND (
    company_id = public.get_user_company_id()
    OR public.is_admin_or_super_admin()
  )
)
WITH CHECK (
  (
    public.can_access_module(auth.uid(), 'material_receiving', 'edit')
    OR public.can_access_module(auth.uid(), 'lab', 'edit')
  )
  AND (
    company_id = public.get_user_company_id()
    OR public.is_admin_or_super_admin()
  )
);

CREATE POLICY "material_receiving_delete_authenticated"
ON public.material_receiving
FOR DELETE
TO authenticated
USING (
  (
    public.can_access_module(auth.uid(), 'material_receiving', 'delete')
    OR public.can_access_module(auth.uid(), 'material_receiving', 'edit')
    OR public.can_access_module(auth.uid(), 'lab', 'delete')
    OR public.can_access_module(auth.uid(), 'lab', 'edit')
  )
  AND (
    company_id = public.get_user_company_id()
    OR public.is_admin_or_super_admin()
  )
);

COMMIT;

