-- Material receiving inventory tracking based on approved reports only.
-- Rules implemented:
-- 1) Consumption is calculated from recipe-traceability tables in approved reports.
-- 2) No backfill for old approved reports (starts from this migration onward).
-- 3) Deleting approved reports releases consumed quantities automatically.
-- 4) accepted_quantity is used as the inventory base (fallback to quantity).

BEGIN;

ALTER TABLE public.material_receiving
    ADD COLUMN IF NOT EXISTS is_manually_depleted boolean,
    ADD COLUMN IF NOT EXISTS manual_depletion_reason text,
    ADD COLUMN IF NOT EXISTS manual_depleted_at timestamptz,
    ADD COLUMN IF NOT EXISTS manual_depleted_by uuid REFERENCES public.users(id);

UPDATE public.material_receiving
SET is_manually_depleted = COALESCE(is_manually_depleted, false)
WHERE is_manually_depleted IS NULL;

ALTER TABLE public.material_receiving
    ALTER COLUMN is_manually_depleted SET DEFAULT false,
    ALTER COLUMN is_manually_depleted SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.material_batch_consumption (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receiving_id uuid NOT NULL REFERENCES public.material_receiving(id) ON DELETE CASCADE,
    report_id uuid NOT NULL REFERENCES public.form_instances(id) ON DELETE CASCADE,
    company_id uuid REFERENCES public.companies(id),
    section_id text NOT NULL,
    table_id text NOT NULL,
    row_index integer NOT NULL,
    ingredient_name text,
    ingredient_quantity numeric,
    ingredient_unit text,
    dough_count numeric NOT NULL DEFAULT 1,
    required_quantity numeric,
    used_quantity numeric NOT NULL,
    used_unit text,
    used_quantity_in_receiving_unit numeric NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT material_batch_consumption_used_qty_check CHECK (used_quantity > 0),
    CONSTRAINT material_batch_consumption_used_qty_receiving_check CHECK (used_quantity_in_receiving_unit > 0),
    CONSTRAINT material_batch_consumption_dough_check CHECK (dough_count > 0)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_batch_consumption_unique_row_batch'
    ) THEN
        ALTER TABLE public.material_batch_consumption
            ADD CONSTRAINT material_batch_consumption_unique_row_batch
            UNIQUE (report_id, section_id, table_id, row_index, receiving_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_material_batch_consumption_receiving
    ON public.material_batch_consumption(receiving_id);

CREATE INDEX IF NOT EXISTS idx_material_batch_consumption_report
    ON public.material_batch_consumption(report_id);

CREATE INDEX IF NOT EXISTS idx_material_batch_consumption_company
    ON public.material_batch_consumption(company_id);

DROP TRIGGER IF EXISTS update_material_batch_consumption_updated_at ON public.material_batch_consumption;
CREATE TRIGGER update_material_batch_consumption_updated_at
    BEFORE UPDATE ON public.material_batch_consumption
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.convert_quantity_between_units(
    p_value numeric,
    p_from text,
    p_to text
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_from text := lower(trim(COALESCE(p_from, '')));
    v_to text := lower(trim(COALESCE(p_to, '')));
    v_from_group text;
    v_to_group text;
    v_from_factor numeric;
    v_to_factor numeric;
BEGIN
    IF p_value IS NULL THEN
        RETURN NULL;
    END IF;

    IF v_from = '' OR v_to = '' THEN
        RETURN NULL;
    END IF;

    IF v_from = v_to THEN
        RETURN p_value;
    END IF;

    CASE v_from
        WHEN 'mg' THEN v_from_group := 'mass'; v_from_factor := 0.001;
        WHEN 'g' THEN v_from_group := 'mass'; v_from_factor := 1;
        WHEN 'kg' THEN v_from_group := 'mass'; v_from_factor := 1000;
        WHEN 'ml' THEN v_from_group := 'volume'; v_from_factor := 1;
        WHEN 'l' THEN v_from_group := 'volume'; v_from_factor := 1000;
        WHEN 'piece', 'pieces', 'pc', 'pcs', 'pack', 'packs', 'unit', 'units' THEN v_from_group := 'count'; v_from_factor := 1;
        ELSE RETURN NULL;
    END CASE;

    CASE v_to
        WHEN 'mg' THEN v_to_group := 'mass'; v_to_factor := 0.001;
        WHEN 'g' THEN v_to_group := 'mass'; v_to_factor := 1;
        WHEN 'kg' THEN v_to_group := 'mass'; v_to_factor := 1000;
        WHEN 'ml' THEN v_to_group := 'volume'; v_to_factor := 1;
        WHEN 'l' THEN v_to_group := 'volume'; v_to_factor := 1000;
        WHEN 'piece', 'pieces', 'pc', 'pcs', 'pack', 'packs', 'unit', 'units' THEN v_to_group := 'count'; v_to_factor := 1;
        ELSE RETURN NULL;
    END CASE;

    IF v_from_group IS DISTINCT FROM v_to_group THEN
        RETURN NULL;
    END IF;

    RETURN (p_value * v_from_factor) / v_to_factor;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_parse_numeric(p_value text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_trimmed text := btrim(COALESCE(p_value, ''));
BEGIN
    IF v_trimmed = '' THEN
        RETURN NULL;
    END IF;

    BEGIN
        RETURN v_trimmed::numeric;
    EXCEPTION WHEN others THEN
        RETURN NULL;
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_report_material_batch_consumption(
    p_report_id uuid,
    p_template_id uuid,
    p_company_id uuid,
    p_form_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_template_sections jsonb := '{}'::jsonb;
    v_section record;
    v_table record;
    v_row record;
    v_batch record;
    v_table_id text;
    v_section_id text;
    v_row_value jsonb;
    v_batches jsonb;
    v_ingredient_name text;
    v_ingredient_quantity numeric;
    v_ingredient_unit text;
    v_dough_count numeric;
    v_required_quantity numeric;
    v_receiving_id_text text;
    v_receiving_id uuid;
    v_used_quantity numeric;
    v_used_unit text;
    v_receiving_unit text;
    v_used_in_receiving numeric;
BEGIN
    DELETE FROM public.material_batch_consumption
    WHERE report_id = p_report_id;

    IF p_form_data IS NULL OR p_template_id IS NULL THEN
        RETURN;
    END IF;

    SELECT COALESCE(ft.sections, '{}'::jsonb)
    INTO v_template_sections
    FROM public.form_templates ft
    WHERE ft.id = p_template_id;

    FOR v_section IN
        SELECT sec.key AS section_id, sec.value AS section_value
        FROM jsonb_each(v_template_sections) AS sec
    LOOP
        v_section_id := v_section.section_id;

        FOR v_table IN
            SELECT tbl.value AS table_value
            FROM jsonb_array_elements(COALESCE(v_section.section_value->'tables', '[]'::jsonb)) AS tbl
            WHERE COALESCE(tbl.value->>'type', '') = 'recipe-traceability'
        LOOP
            v_table_id := NULLIF(v_table.table_value->>'id', '');
            IF v_table_id IS NULL THEN
                CONTINUE;
            END IF;

            FOR v_row IN
                SELECT (row_item.ordinality - 1)::integer AS row_index, row_item.value AS row_value
                FROM jsonb_array_elements(
                    COALESCE(p_form_data->'sections'->v_section_id->'tables'->v_table_id->'data', '[]'::jsonb)
                ) WITH ORDINALITY AS row_item(value, ordinality)
            LOOP
                v_row_value := v_row.row_value;
                IF jsonb_typeof(v_row_value) <> 'array' THEN
                    CONTINUE;
                END IF;

                v_ingredient_name := NULLIF(v_row_value->>0, '');
                v_ingredient_quantity := public.try_parse_numeric(v_row_value->>1);
                v_ingredient_unit := NULLIF(v_row_value->>2, '');
                v_dough_count := COALESCE(public.try_parse_numeric(v_row_value->>4), 1);

                IF v_dough_count IS NULL OR v_dough_count <= 0 THEN
                    v_dough_count := 1;
                END IF;

                v_required_quantity :=
                    CASE
                        WHEN v_ingredient_quantity IS NULL THEN NULL
                        ELSE v_ingredient_quantity * v_dough_count
                    END;

                v_batches := v_row_value->3;
                IF jsonb_typeof(v_batches) <> 'array' THEN
                    CONTINUE;
                END IF;

                FOR v_batch IN
                    SELECT batch_item.value AS batch_value
                    FROM jsonb_array_elements(v_batches) AS batch_item
                LOOP
                    v_receiving_id_text := NULLIF(
                        COALESCE(v_batch.batch_value->>'receivingId', v_batch.batch_value->>'receiving_id'),
                        ''
                    );
                    IF v_receiving_id_text IS NULL THEN
                        CONTINUE;
                    END IF;
                    IF v_receiving_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                        CONTINUE;
                    END IF;
                    v_receiving_id := v_receiving_id_text::uuid;

                    v_used_quantity := COALESCE(
                        public.try_parse_numeric(v_batch.batch_value->>'usedQuantity'),
                        public.try_parse_numeric(v_batch.batch_value->>'used_quantity')
                    );

                    IF v_used_quantity IS NULL OR v_used_quantity <= 0 THEN
                        CONTINUE;
                    END IF;

                    v_used_unit := NULLIF(
                        COALESCE(
                            v_batch.batch_value->>'usedUnit',
                            v_batch.batch_value->>'used_unit',
                            v_batch.batch_value->>'unit',
                            v_ingredient_unit
                        ),
                        ''
                    );

                    SELECT mr.unit
                    INTO v_receiving_unit
                    FROM public.material_receiving mr
                    WHERE mr.id = v_receiving_id;

                    IF v_receiving_unit IS NULL THEN
                        CONTINUE;
                    END IF;

                    IF v_used_unit IS NULL OR lower(trim(v_used_unit)) = lower(trim(v_receiving_unit)) THEN
                        v_used_in_receiving := v_used_quantity;
                    ELSE
                        v_used_in_receiving := public.convert_quantity_between_units(
                            v_used_quantity,
                            v_used_unit,
                            v_receiving_unit
                        );
                    END IF;

                    IF v_used_in_receiving IS NULL OR v_used_in_receiving <= 0 THEN
                        CONTINUE;
                    END IF;

                    INSERT INTO public.material_batch_consumption (
                        receiving_id,
                        report_id,
                        company_id,
                        section_id,
                        table_id,
                        row_index,
                        ingredient_name,
                        ingredient_quantity,
                        ingredient_unit,
                        dough_count,
                        required_quantity,
                        used_quantity,
                        used_unit,
                        used_quantity_in_receiving_unit
                    ) VALUES (
                        v_receiving_id,
                        p_report_id,
                        p_company_id,
                        v_section_id,
                        v_table_id,
                        v_row.row_index,
                        v_ingredient_name,
                        v_ingredient_quantity,
                        v_ingredient_unit,
                        v_dough_count,
                        v_required_quantity,
                        v_used_quantity,
                        v_used_unit,
                        v_used_in_receiving
                    )
                    ON CONFLICT (report_id, section_id, table_id, row_index, receiving_id)
                    DO UPDATE SET
                        ingredient_name = EXCLUDED.ingredient_name,
                        ingredient_quantity = EXCLUDED.ingredient_quantity,
                        ingredient_unit = EXCLUDED.ingredient_unit,
                        dough_count = EXCLUDED.dough_count,
                        required_quantity = EXCLUDED.required_quantity,
                        used_quantity = EXCLUDED.used_quantity,
                        used_unit = EXCLUDED.used_unit,
                        used_quantity_in_receiving_unit = EXCLUDED.used_quantity_in_receiving_unit,
                        updated_at = now();
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_form_instance_material_consumption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.material_batch_consumption
        WHERE report_id = OLD.id;
        RETURN OLD;
    END IF;

    IF NEW.status = 'approved' AND COALESCE(NEW.archived, false) = false THEN
        PERFORM public.sync_report_material_batch_consumption(
            NEW.id,
            NEW.template_id,
            NEW.company_id,
            NEW.form_data
        );
    ELSE
        DELETE FROM public.material_batch_consumption
        WHERE report_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_form_instance_material_consumption ON public.form_instances;
CREATE TRIGGER trg_form_instance_material_consumption
    AFTER INSERT OR UPDATE OR DELETE ON public.form_instances
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_form_instance_material_consumption();

CREATE OR REPLACE VIEW public.v_material_receiving_inventory
WITH (security_invoker = 'true')
AS
SELECT
    mr.*,
    COALESCE(cons.total_consumed, 0::numeric) AS consumed_quantity,
    GREATEST(
        COALESCE(mr.accepted_quantity, mr.quantity, 0::numeric) - COALESCE(cons.total_consumed, 0::numeric),
        0::numeric
    ) AS remaining_quantity,
    (
        mr.status IN ('accepted', 'approved')
        AND COALESCE(mr.is_manually_depleted, false) = false
        AND GREATEST(
            COALESCE(mr.accepted_quantity, mr.quantity, 0::numeric) - COALESCE(cons.total_consumed, 0::numeric),
            0::numeric
        ) > 0
    ) AS is_available_for_issue
FROM public.material_receiving mr
LEFT JOIN (
    SELECT
        mbc.receiving_id,
        SUM(mbc.used_quantity_in_receiving_unit) AS total_consumed
    FROM public.material_batch_consumption mbc
    GROUP BY mbc.receiving_id
) cons
    ON cons.receiving_id = mr.id;

ALTER TABLE public.material_batch_consumption ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    has_company_access_fn boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'material_batch_consumption'
          AND policyname = 'material_batch_consumption_select_matrix'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname = 'has_company_access'
              AND pg_get_function_identity_arguments(p.oid) = 'uuid'
        )
        INTO has_company_access_fn;

        IF has_company_access_fn THEN
            EXECUTE $policy$
                CREATE POLICY material_batch_consumption_select_matrix
                    ON public.material_batch_consumption
                    FOR SELECT
                    TO authenticated
                    USING (
                        company_id IS NULL
                        OR public.has_company_access(company_id)
                    )
            $policy$;
        ELSE
            EXECUTE $policy$
                CREATE POLICY material_batch_consumption_select_matrix
                    ON public.material_batch_consumption
                    FOR SELECT
                    TO authenticated
                    USING (
                        company_id IS NULL
                        OR company_id = public.get_user_company_id()
                    )
            $policy$;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'material_batch_consumption'
          AND policyname = 'material_batch_consumption_service_role_all'
    ) THEN
        CREATE POLICY material_batch_consumption_service_role_all
            ON public.material_batch_consumption
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

GRANT SELECT ON TABLE public.material_batch_consumption TO anon;
GRANT SELECT ON TABLE public.material_batch_consumption TO authenticated;
GRANT ALL ON TABLE public.material_batch_consumption TO service_role;

GRANT SELECT ON TABLE public.v_material_receiving_inventory TO anon;
GRANT SELECT ON TABLE public.v_material_receiving_inventory TO authenticated;
GRANT ALL ON TABLE public.v_material_receiving_inventory TO service_role;

COMMENT ON TABLE public.material_batch_consumption
    IS 'Material batch consumption ledger generated from approved recipe-traceability reports.';

COMMENT ON VIEW public.v_material_receiving_inventory
    IS 'Material receiving inventory with consumed and remaining quantities derived from approved reports.';

COMMIT;
