-- Migration: Populate Missing Receiving Data
-- تعبئة البيانات الناقصة في سجلات الاستلام (نوع التعبئة، ظروف التخزين، نوع التعبئة)
UPDATE public.material_receiving
SET packaging_type = CASE
        WHEN material_type = 'ingredient'
        AND unit = 'كجم' THEN 'أكياس ورقية متعددة الطبقات'
        WHEN material_type = 'ingredient'
        AND unit = 'لتر' THEN 'تانكر ستانلس ستيل'
        WHEN material_type = 'additive' THEN 'عبوات كرتونية'
        WHEN material_type = 'flavoring' THEN 'جراكن بلاستيك HDPE'
        ELSE 'أكياس'
    END,
    storage_condition = CASE
        WHEN material_name LIKE '%لبن%'
        OR material_name LIKE '%زبدة%'
        OR material_name LIKE '%كاكاو%' THEN 'تبريد (2-8°C)'
        WHEN material_name LIKE '%شورتننج%' THEN 'تبريد (10-15°C)'
        ELSE 'جاف ومظلم وبارد'
    END
WHERE packaging_type IS NULL
    OR storage_condition IS NULL
    OR storage_condition = '';
-- تحديث خانات "نوع التعبئة" في فحص السيارة إذا كانت فارغة
UPDATE public.material_receiving
SET vehicle_inspection = jsonb_set(
        vehicle_inspection,
        '{vehicle_type}',
        '"شاحنة مغلقة"'
    )
WHERE vehicle_inspection->>'vehicle_type' IS NULL;
DO $$ BEGIN RAISE NOTICE 'تم تحديث البيانات الناقصة بنجاح';
END $$;