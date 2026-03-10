BEGIN;

DO $$
DECLARE
  v_product record;
  v_company record;
  v_test_id uuid;
  v_param_id uuid;
  v_found_product boolean := false;
  v_code text;
BEGIN
  /*
    Pass 1: create/update product-linked example for any product matching:
    "باتر ساندوتش" / "butter sandwich"
    Matching is intentionally tolerant (spaces + English fallback).
  */
  FOR v_product IN
    SELECT
      p.id,
      p.company_id,
      p.name,
      p.name_en
    FROM public.products p
    WHERE p.company_id IS NOT NULL
      AND (
        coalesce(p.name, '') ILIKE '%باتر ساندوتش%'
        OR coalesce(p.name, '') ILIKE '%باترساندوتش%'
        OR regexp_replace(coalesce(p.name, ''), '\s+', '', 'g') ILIKE '%باترساندوتش%'
        OR coalesce(p.name, '') ILIKE '%butter sandwich%'
        OR coalesce(p.name_en, '') ILIKE '%butter sandwich%'
      )
  LOOP
    v_found_product := true;
    v_code := format('MOIST-BS-%s', upper(substr(replace(v_product.id::text, '-', ''), 1, 6)));

    SELECT t.id
    INTO v_test_id
    FROM public.lab_v2_tests t
    WHERE t.company_id = v_product.company_id
      AND (
        t.linked_product_id = v_product.id
        OR t.code = v_code
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
        v_code,
        format('Product Moisture Test - %s', coalesce(v_product.name, 'Butter Sandwich')),
        format('فحص رطوبة المنتج - %s', coalesce(v_product.name, 'باتر ساندوتش')),
        'final_release',
        'Final Release',
        'فحص رطوبة المنتج النهائي لضمان مطابقة المواصفة.',
        'قياس رطوبة المنتج باستخدام Moisture Analyzer بعد التحقق من المعايرة.',
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
        name = format('Product Moisture Test - %s', coalesce(v_product.name, 'Butter Sandwich')),
        name_ar = format('فحص رطوبة المنتج - %s', coalesce(v_product.name, 'باتر ساندوتش')),
        test_family = 'final_release',
        category = coalesce(category, 'Final Release'),
        scope = 'product',
        linked_product_id = v_product.id,
        requires_approval = true,
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

  /*
    Pass 2 fallback: if no matching product was found, still create a visible
    company-level example per company (from known company ids) so the user sees
    the sample in catalog immediately.
  */
  IF NOT v_found_product THEN
    FOR v_company IN
      SELECT DISTINCT x.company_id
      FROM (
        SELECT p.company_id FROM public.products p WHERE p.company_id IS NOT NULL
        UNION
        SELECT t.company_id FROM public.lab_v2_tests t WHERE t.company_id IS NOT NULL
      ) x
    LOOP
      v_code := format('MOIST-BS-COMP-%s', upper(substr(replace(v_company.company_id::text, '-', ''), 1, 6)));

      SELECT t.id
      INTO v_test_id
      FROM public.lab_v2_tests t
      WHERE t.company_id = v_company.company_id
        AND t.code = v_code
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
          v_code,
          'Product Moisture Test - Butter Sandwich',
          'فحص رطوبة المنتج - باتر ساندوتش (بسكويت)',
          'final_release',
          'Final Release',
          'مثال فحص رطوبة منتج بنطاق قبول 0.5 - 2.5',
          'قياس الرطوبة بجهاز Moisture Analyzer.',
          'Internal Moisture Method',
          'company',
          null,
          true,
          true,
          v_company.company_id,
          null,
          null
        )
        RETURNING id INTO v_test_id;
      ELSE
        UPDATE public.lab_v2_tests
        SET
          name = 'Product Moisture Test - Butter Sandwich',
          name_ar = 'فحص رطوبة المنتج - باتر ساندوتش (بسكويت)',
          test_family = 'final_release',
          category = coalesce(category, 'Final Release'),
          scope = 'company',
          linked_product_id = null,
          requires_approval = true,
          is_active = true,
          updated_at = now()
        WHERE id = v_test_id;
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
    END LOOP;

    RAISE NOTICE 'No direct product match found. Company-level fallback example was created.';
  END IF;
END $$;

COMMIT;
