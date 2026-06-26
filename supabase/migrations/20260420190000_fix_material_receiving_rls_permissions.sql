-- Migration: Fix material_receiving RLS permission module mapping
-- Date: 2026-04-20
-- Problem: material_receiving RLS policies were checking module_code 'lab' only, while many roles grant
--          permissions via module_code 'material_receiving'. This causes authenticated INSERT to fail (403)
--          even when the user has the expected permissions in the matrix.
-- Solution: Accept either 'material_receiving' or 'lab' module permissions for view/create/edit/delete,
--          while keeping company isolation checks.

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
  AND (company_id IS NULL OR company_id = public.get_user_company_id())
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
  AND (company_id IS NULL OR company_id = public.get_user_company_id())
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
  AND (company_id IS NULL OR company_id = public.get_user_company_id())
)
WITH CHECK (
  (
    public.can_access_module(auth.uid(), 'material_receiving', 'edit')
    OR public.can_access_module(auth.uid(), 'lab', 'edit')
  )
  AND (company_id IS NULL OR company_id = public.get_user_company_id())
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
  AND (company_id IS NULL OR company_id = public.get_user_company_id())
);

COMMIT;

