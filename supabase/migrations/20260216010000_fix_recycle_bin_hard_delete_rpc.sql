-- Migration: Fix hard_delete_recycle_bin_item RPC (uuid/text mismatch + missing function)
-- Date: 2026-02-16
-- Why:
--   Frontend calls /rpc/hard_delete_recycle_bin_item and hits:
--   - 404 (function missing on some environments)
--   - 42883 operator does not exist: uuid = text (type mismatch inside SQL)
--
-- What this migration does:
--   1) Creates/replaces public.hard_delete_recycle_bin_item(p_recycle_bin_id uuid).
--   2) Enforces permission check equivalent to recycle_bin delete policy.
--   3) Deletes original entity safely with explicit UUID casting.
--   4) Removes recycle_bin row and returns a small JSON payload.

SET app.bypass_permission_check = 'on';

-- PostgreSQL does not allow changing function return type with CREATE OR REPLACE.
-- Drop any existing overload(s) first, then recreate with the desired signature/return type.
DO $$
DECLARE
    v_fn text;
BEGIN
    FOR v_fn IN
        SELECT p.oid::regprocedure::text
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'hard_delete_recycle_bin_item'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s', v_fn);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.hard_delete_recycle_bin_item(
    p_recycle_bin_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item public.recycle_bin%ROWTYPE;
    v_original_uuid uuid;
    v_uuid_regex constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT *
    INTO v_item
    FROM public.recycle_bin
    WHERE id = p_recycle_bin_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recycle bin item not found: %', p_recycle_bin_id
            USING ERRCODE = 'P0002';
    END IF;

    IF NOT (
        v_item.deleted_by = auth.uid()
        OR public.check_forms_permission(auth.uid(), 'delete', NULL::uuid)
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to hard delete recycle bin item'
            USING ERRCODE = '42501';
    END IF;

    IF v_item.original_id ~* v_uuid_regex THEN
        v_original_uuid := v_item.original_id::uuid;
    ELSE
        v_original_uuid := NULL;
    END IF;

    IF v_item.item_type = 'instance' THEN
        IF v_original_uuid IS NOT NULL THEN
            DELETE FROM public.form_instances
            WHERE id = v_original_uuid;
        END IF;

    ELSIF v_item.item_type = 'template' THEN
        IF v_original_uuid IS NOT NULL THEN
            DELETE FROM public.form_instances
            WHERE template_id = v_original_uuid;

            DELETE FROM public.form_templates
            WHERE id = v_original_uuid;
        END IF;

    ELSIF v_item.item_type = 'folder' THEN
        -- Delete known descendants captured in recycle_bin snapshot first.
        DELETE FROM public.form_instances
        WHERE id IN (
            SELECT x.item_uuid
            FROM (
                SELECT
                    CASE
                        WHEN COALESCE(elem->>'instance_id', elem->>'id') ~* v_uuid_regex
                        THEN COALESCE(elem->>'instance_id', elem->>'id')::uuid
                        ELSE NULL::uuid
                    END AS item_uuid
                FROM jsonb_array_elements(
                    COALESCE(v_item.data->'contents'->'instances', '[]'::jsonb)
                ) elem
            ) x
            WHERE x.item_uuid IS NOT NULL
        );

        DELETE FROM public.form_templates
        WHERE id IN (
            SELECT x.item_uuid
            FROM (
                SELECT
                    CASE
                        WHEN elem->>'id' ~* v_uuid_regex
                        THEN (elem->>'id')::uuid
                        ELSE NULL::uuid
                    END AS item_uuid
                FROM jsonb_array_elements(
                    COALESCE(v_item.data->'contents'->'templates', '[]'::jsonb)
                ) elem
            ) x
            WHERE x.item_uuid IS NOT NULL
        );

        DELETE FROM public.unified_folders
        WHERE id IN (
            SELECT x.item_uuid
            FROM (
                SELECT
                    CASE
                        WHEN elem->>'id' ~* v_uuid_regex
                        THEN (elem->>'id')::uuid
                        ELSE NULL::uuid
                    END AS item_uuid
                FROM jsonb_array_elements(
                    COALESCE(v_item.data->'contents'->'folders', '[]'::jsonb)
                ) elem
            ) x
            WHERE x.item_uuid IS NOT NULL
        );

        IF v_original_uuid IS NOT NULL THEN
            DELETE FROM public.unified_folders
            WHERE id = v_original_uuid;
        END IF;
    END IF;

    DELETE FROM public.recycle_bin
    WHERE id = v_item.id;

    RETURN jsonb_build_object(
        'ok', true,
        'recycle_bin_id', v_item.id,
        'item_type', v_item.item_type,
        'original_id', v_item.original_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hard_delete_recycle_bin_item(uuid) TO authenticated;

SET app.bypass_permission_check = 'off';
