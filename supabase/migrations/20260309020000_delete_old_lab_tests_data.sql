BEGIN;

-- Delete all existing lab tests runs first (children may reference runs).
DELETE FROM public.lab_v2_run_values;
DELETE FROM public.lab_v2_run_measurements;
DELETE FROM public.lab_v2_run_material_selections;
DELETE FROM public.lab_v2_run_materials;
DELETE FROM public.lab_v2_test_runs;

-- Delete all existing test definitions and related configuration.
DELETE FROM public.lab_v2_test_step_material_plans;
DELETE FROM public.lab_v2_test_step_device_plans;
DELETE FROM public.lab_v2_test_steps;
DELETE FROM public.lab_v2_test_product_links;
DELETE FROM public.lab_v2_test_device_links;
DELETE FROM public.lab_v2_test_acceptance_rules;
DELETE FROM public.lab_v2_test_parameters;
DELETE FROM public.lab_v2_tests;

COMMIT;
