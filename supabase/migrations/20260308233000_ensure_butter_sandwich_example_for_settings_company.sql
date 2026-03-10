BEGIN;

DO $$
DECLARE
  v_company_id uuid;
  v_product_id uuid;
  v_product_name text;
  v_test_id uuid;
  v_param_id uuid;
BEGIN
  SELECT s.main_company_id
  INTO v_company_id
  FROM public.settings s
  WHERE s.id = 'global'
    AND s.main_company_id IS NOT NULL
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE NOTICE 'Skipped: settings.main_company_id is NULL.';
    RETURN;
  END IF;

  SELECT
    p.id,
    coalesce(nullif(btrim(p.name), ''), nullif(btrim(p.name_en), ''), 'باتر ساندوتش')
  INTO v_product_id, v_product_name
  FROM public.products p
  WHERE p.company_id = v_company_id
    AND (
      coalesce(p.name, '') ILIKE '%باتر ساندوتش%'
      OR coalesce(p.name, '') ILIKE '%باترساندوتش%'
      OR regexp_replace(coalesce(p.name, ''), '\s+', '', 'g') ILIKE '%باترساندوتش%'
      OR coalesce(p.name, '') ILIKE '%butter sandwich%'
      OR coalesce(p.name_en, '') ILIKE '%butter sandwich%'
    )
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT 1;

  SELECT t.id
  INTO v_test_id
  FROM public.lab_v2_tests t
  WHERE t.company_id = v_company_id
    AND (
      t.code = 'MOIST-BS-MANUAL'
      OR t.code = 'MOIST-BS-EXAMPLE'
      OR (
        coalesce(t.name_ar, '') ILIKE '%فحص رطوبة المنتج%'
        AND coalesce(t.name_ar, '') ILIKE '%باتر%'
        AND coalesce(t.name_ar, '') ILIKE '%ساندوتش%'
      )
    )
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_test_id IS NULL THEN
    INSERT INTO public.lab_v2_tests (
      code,
      name,
      name_ar,
      test_family,
      category,
      description,
      method_description,
      method_standard,
      scope,
      linked_product_id,
      requires_approval,
      is_active,
      company_id,
      created_by,
      updated_by
    ) VALUES (
      'MOIST-BS-MANUAL',
      format(
        'Product Moisture Test - %s',
        coalesce(v_product_name, 'Butter Sandwich')
      ),
      format(
        'فحص رطوبة المنتج - %s',
        coalesce(v_product_name, 'باتر ساندوتش')
      ),
      'final_release',
      'Final Release',
      'مثال فحص رطوبة منتج بنطاق قبول 0.5 - 2.5',
      'قياس الرطوبة بجهاز Moisture Analyzer.',
      'Internal Moisture Method',
      CASE WHEN v_product_id IS NULL THEN 'company' ELSE 'product' END,
      v_product_id,
      true,
      true,
      v_company_id,
      null,
      null
    )
    RETURNING id INTO v_test_id;
  ELSE
    UPDATE public.lab_v2_tests
    SET
      code = 'MOIST-BS-MANUAL',
      name = format(
        'Product Moisture Test - %s',
        coalesce(v_product_name, 'Butter Sandwich')
      ),
      name_ar = format(
        'فحص رطوبة المنتج - %s',
        coalesce(v_product_name, 'باتر ساندوتش')
      ),
      test_family = 'final_release',
      category = coalesce(category, 'Final Release'),
      description = coalesce(description, 'مثال فحص رطوبة منتج بنطاق قبول 0.5 - 2.5'),
      method_description = coalesce(method_description, 'قياس الرطوبة بجهاز Moisture Analyzer.'),
      method_standard = coalesce(method_standard, 'Internal Moisture Method'),
      scope = CASE WHEN v_product_id IS NULL THEN 'company' ELSE 'product' END,
      linked_product_id = v_product_id,
      requires_approval = true,
      is_active = true,
      updated_at = now()
    WHERE id = v_test_id;
  END IF;

  IF v_product_id IS NOT NULL THEN
    INSERT INTO public.lab_v2_test_product_links (
      test_id,
      product_id,
      is_active,
      created_by,
      updated_by
    ) VALUES (
      v_test_id,
      v_product_id,
      true,
      null,
      null
    )
    ON CONFLICT (test_id, product_id)
    DO UPDATE
    SET
      is_active = true,
      updated_at = now(),
      updated_by = excluded.updated_by;
  END IF;

  SELECT p.id
  INTO v_param_id
  FROM public.lab_v2_test_parameters p
  WHERE p.test_id = v_test_id
    AND p.param_key = 'moisture_percent'
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_param_id IS NULL THEN
    INSERT INTO public.lab_v2_test_parameters (
      test_id,
      param_key,
      label,
      label_ar,
      data_type,
      is_required,
      display_order,
      unit,
      min_value,
      max_value,
      allowed_values,
      default_value,
      help_text
    ) VALUES (
      v_test_id,
      'moisture_percent',
      'Moisture %',
      'رطوبة المنتج',
      'number',
      true,
      0,
      '%',
      0.5,
      2.5,
      null,
      null,
      'النطاق المقبول: من 0.5 إلى 2.5'
    )
    RETURNING id INTO v_param_id;
  ELSE
    UPDATE public.lab_v2_test_parameters
    SET
      label = 'Moisture %',
      label_ar = 'رطوبة المنتج',
      data_type = 'number',
      is_required = true,
      display_order = 0,
      unit = '%',
      min_value = 0.5,
      max_value = 2.5,
      help_text = 'النطاق المقبول: من 0.5 إلى 2.5'
    WHERE id = v_param_id;
  END IF;

  DELETE FROM public.lab_v2_test_acceptance_rules
  WHERE test_id = v_test_id
    AND parameter_id = v_param_id;

  INSERT INTO public.lab_v2_test_acceptance_rules (
    test_id,
    parameter_id,
    rule_type,
    spec_min,
    spec_max,
    spec_unit,
    allowed_values,
    custom_note,
    priority,
    created_by
  ) VALUES (
    v_test_id,
    v_param_id,
    'numeric_range',
    0.5,
    2.5,
    '%',
    null,
    'المواصفة المعتمدة لرطوبة منتج باتر ساندوتش (بسكويت).',
    0,
    null
  );
END $$;

COMMIT;
