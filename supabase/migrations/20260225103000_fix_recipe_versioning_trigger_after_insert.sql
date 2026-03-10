-- Fix recipe versioning trigger timing
-- السبب: كان Trigger يعمل BEFORE INSERT على recipes
-- ويكتب في recipe_versions قبل إدراج recipe الفعلي، مما يسبب FK violation.

CREATE OR REPLACE FUNCTION public.create_recipe_version()
RETURNS trigger AS $$
DECLARE
    v_recipe_id UUID;
    new_version DECIMAL(4, 1);
    last_version_id UUID;
    change_summary_text TEXT;
    change_details_json JSONB;
    user_name TEXT;
BEGIN
    v_recipe_id := NEW.id;

    -- الحصول على اسم المستخدم
    SELECT COALESCE(raw_user_meta_data->>'full_name', email)
    INTO user_name
    FROM auth.users
    WHERE id = auth.uid();

    -- حساب رقم الإصدار الجديد
    SELECT COALESCE(MAX(version_number), 0) + 0.1
    INTO new_version
    FROM public.recipe_versions
    WHERE recipe_id = v_recipe_id;

    IF new_version < 1 THEN
        new_version := 1.0;
    END IF;

    -- إغلاق الإصدار السابق (إن وجد)
    UPDATE public.recipe_versions
    SET effective_until = NOW()
    WHERE recipe_id = v_recipe_id
      AND effective_until IS NULL;

    -- تحديد نوع التغيير والملخص
    IF TG_OP = 'INSERT' THEN
        change_summary_text := 'تم إنشاء الوصفة';
        change_details_json := jsonb_build_object('action', 'created');
    ELSE
        change_details_json := jsonb_build_object();

        IF OLD.name IS DISTINCT FROM NEW.name THEN
            change_details_json := change_details_json || jsonb_build_object(
                'name',
                jsonb_build_object('old', OLD.name, 'new', NEW.name)
            );
        END IF;

        IF OLD.ingredients::text IS DISTINCT FROM NEW.ingredients::text THEN
            change_details_json := change_details_json || jsonb_build_object(
                'ingredients',
                'تم تحديث المكونات'
            );
        END IF;

        IF OLD.mixing_steps::text IS DISTINCT FROM NEW.mixing_steps::text THEN
            change_details_json := change_details_json || jsonb_build_object(
                'mixing_steps',
                'تم تحديث خطوات الخلط'
            );
        END IF;

        change_summary_text := 'تم تحديث الوصفة';
    END IF;

    -- إنشاء الإصدار الجديد (الآن الوصفة موجودة فعليًا لأن التريجر AFTER)
    INSERT INTO public.recipe_versions (
        recipe_id,
        version_number,
        name,
        name_en,
        ingredients,
        mixing_steps,
        notes,
        change_type,
        change_summary,
        change_details,
        effective_from,
        created_by,
        created_by_name
    )
    VALUES (
        v_recipe_id,
        new_version,
        NEW.name,
        NEW.name_en,
        NEW.ingredients,
        NEW.mixing_steps,
        NEW.notes,
        CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END,
        change_summary_text,
        change_details_json,
        NOW(),
        auth.uid(),
        user_name
    )
    RETURNING id INTO last_version_id;

    -- تحديث بيانات النسخة الحالية على جدول recipes
    -- هذا UPDATE يشغل trigger مرة ثانية بعمق > 0 ولن يعيد إنشاء نسخة (بسبب شرط pg_trigger_depth)
    UPDATE public.recipes
    SET current_version_id = last_version_id,
        version_count = (
            SELECT COUNT(*)
            FROM public.recipe_versions
            WHERE recipe_id = v_recipe_id
        ),
        last_versioned_at = NOW(),
        version = new_version::text
    WHERE id = v_recipe_id;

    -- تسجيل التغيير
    INSERT INTO public.recipe_change_log (
        recipe_id,
        version_id,
        action,
        changed_by,
        changed_by_name,
        reason
    )
    VALUES (
        v_recipe_id,
        last_version_id,
        CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE 'update' END,
        auth.uid(),
        user_name,
        change_summary_text
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_recipe_versioning ON public.recipes;
CREATE TRIGGER trigger_recipe_versioning
AFTER INSERT OR UPDATE ON public.recipes
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION public.create_recipe_version();
