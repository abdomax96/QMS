-- Fix Arabic encoding using Unicode escape sequences
-- This avoids encoding issues with psql on Windows
UPDATE public.app_modules
SET name_ar = E'\u0627\u0644\u0646\u0645\u0627\u0630\u062c \u0648\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631'
WHERE code = 'forms_reports';
UPDATE public.app_modules
SET name_ar = E'\u0627\u0644\u0645\u0647\u0627\u0645'
WHERE code = 'tasks';
UPDATE public.app_modules
SET name_ar = E'\u0627\u0644\u0645\u062e\u062a\u0628\u0631'
WHERE code = 'lab';
UPDATE public.app_modules
SET name_ar = E'NCR \u0648\u0627\u0644\u0645\u062d\u062a\u062c\u0632\u0627\u062a'
WHERE code = 'ncr';
UPDATE public.app_modules
SET name_ar = E'\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a'
WHERE code = 'access_management';