BEGIN;

DO $$
DECLARE
  v_product record;
  v_test_id uuid;
  v_param_id uuid;
  v_found_any boolean := false;
BEGIN
  FOR v_product IN
    SELECT
      p.id,
      p.company_id,
      p.name,
      p.sku
    FROM public.products p
    WHERE p.is_active = true
      AND (
        coalesce(p.name, '') ILIKE '%باتر ساندوتش%'
        OR coalesce(p.name, '') ILIKE '%butter sandwich%'
        OR coalesce(p.name_en, '') ILIKE '%butter sandwich%'
      )
  LOOP
    v_found_any := true;

    SELECT t.id
    INTO v_test_id
    FROM public.lab_v2_tests t
    WHERE t.company_id = v_product.company_id
      AND (
        t.linked_product_id = v_product.id
        OR t.code = format('MOIST-BS-%s', upper(substr(replace(v_product.id::text, '-', ''), 1, 6)))
        OR t.name_ar = format('فحص رطوبة المنتج - %s', coalesce(v_product.name, 'باتر ساندوتش (بسكويت)'))
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
        format('MOIST-BS-%s', upper(substr(replace(v_product.id::text, '-', ''), 1, 6))),
        format('Product Moisture Test - %s', coalesce(v_product.name, 'Butter Sandwich (Biscuit)')),
        format('فحص رطوبة المنتج - %s', coalesce(v_product.name, 'باتر ساندوتش (بسكويت)')),
        'final_release',
        'Final Release',
        'فحص رطوبة المنتج النهائي لضمان مطابقة المواصفة.',
        'قياس رطوبة المنتج باستخدام جهاز Moisture Analyzer بعد التحقق من المعايرة.',
        'Internal Moisture Method',
        'product',
        v_product.id,
        true,
        true,
        v_product.company_id,
        null,
        null
      )
      RETURNING id INTO v_test_id;
    ELSE
      UPDATE public.lab_v2_tests
      SET
        test_family = 'final_release',
        category = coalesce(category, 'Final Release'),
        scope = 'product',
        linked_product_id = v_product.id,
        is_active = true,
        updated_at = now()
      WHERE id = v_test_id;
    END IF;

    INSERT INTO public.lab_v2_test_product_links (
      test_id,
      product_id,
      is_active,
      created_by,
      updated_by
    ) VALUES (
      v_test_id,
      v_product.id,
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
  END LOOP;

  IF NOT v_found_any THEN
    RAISE NOTICE 'No matching product found for "باتر ساندوتش / butter sandwich".';
  END IF;
END $$;

COMMIT;
