-- Recipe Version History System
-- نظام تتبع إصدارات الوصفات
-- =====================================================
-- 1. جدول سجل إصدارات الوصفات
-- =====================================================
CREATE TABLE IF NOT EXISTS recipe_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    version_number DECIMAL(4, 1) NOT NULL DEFAULT 1.0,
    -- بيانات الإصدار (نسخة كاملة من الوصفة في هذا الإصدار)
    name TEXT NOT NULL,
    name_en TEXT,
    ingredients JSONB NOT NULL DEFAULT '[]',
    mixing_steps JSONB DEFAULT '[]',
    notes TEXT,
    -- معلومات التغيير
    change_type TEXT NOT NULL DEFAULT 'created',
    -- 'created', 'updated', 'ingredients_changed', 'steps_changed', 'restored'
    change_summary TEXT,
    -- ملخص التغييرات بالعربية
    change_details JSONB,
    -- تفاصيل التغييرات (الحقول المتغيرة والقيم)
    -- فترة السريان
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMP WITH TIME ZONE,
    -- NULL = الإصدار الحالي/النشط
    -- المستخدم المسؤول
    created_by UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- فهرس فريد لكل إصدار
    UNIQUE(recipe_id, version_number)
);
-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_recipe_versions_recipe_id ON recipe_versions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_versions_effective_from ON recipe_versions(effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_versions_change_type ON recipe_versions(change_type);
-- =====================================================
-- 2. جدول سجل التغييرات التفصيلي
-- =====================================================
CREATE TABLE IF NOT EXISTS recipe_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    version_id UUID REFERENCES recipe_versions(id) ON DELETE
    SET NULL,
        -- نوع الإجراء
        action TEXT NOT NULL,
        -- 'create', 'update', 'delete', 'restore', 'approve', 'reject'
        field_changed TEXT,
        -- اسم الحقل المتغير (null إذا كان إجراء عام)
        -- القيم
        old_value JSONB,
        -- القيمة القديمة
        new_value JSONB,
        -- القيمة الجديدة
        -- المستخدم
        changed_by UUID REFERENCES auth.users(id),
        changed_by_name TEXT,
        changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        -- سياق إضافي
        reason TEXT,
        -- سبب التغيير (اختياري)
        session_id TEXT,
        -- معرف الجلسة
        ip_address INET -- عنوان IP
);
-- فهارس
CREATE INDEX IF NOT EXISTS idx_recipe_change_log_recipe_id ON recipe_change_log(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_change_log_changed_at ON recipe_change_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_change_log_action ON recipe_change_log(action);
-- =====================================================
-- 3. تحديث جدول الوصفات الأصلي
-- =====================================================
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES recipe_versions(id),
    ADD COLUMN IF NOT EXISTS version_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS last_versioned_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
-- 'draft', 'pending', 'approved', 'rejected'
-- =====================================================
-- 4. دالة حساب مدة الإصدار بالأيام
-- =====================================================
CREATE OR REPLACE FUNCTION get_version_duration_days(v_id UUID) RETURNS INTEGER AS $$
DECLARE v_from TIMESTAMP WITH TIME ZONE;
v_until TIMESTAMP WITH TIME ZONE;
BEGIN
SELECT effective_from,
    effective_until INTO v_from,
    v_until
FROM recipe_versions
WHERE id = v_id;
IF v_until IS NULL THEN RETURN EXTRACT(
    DAY
    FROM NOW() - v_from
)::INTEGER;
ELSE RETURN EXTRACT(
    DAY
    FROM v_until - v_from
)::INTEGER;
END IF;
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- 5. دالة إنشاء إصدار جديد تلقائياً
-- =====================================================
CREATE OR REPLACE FUNCTION create_recipe_version() RETURNS TRIGGER AS $$
DECLARE new_version DECIMAL(4, 1);
last_version_id UUID;
change_summary_text TEXT;
change_details_json JSONB;
user_name TEXT;
BEGIN -- الحصول على اسم المستخدم
SELECT COALESCE(raw_user_meta_data->>'full_name', email) INTO user_name
FROM auth.users
WHERE id = auth.uid();
-- حساب رقم الإصدار الجديد
SELECT COALESCE(MAX(version_number), 0) + 0.1 INTO new_version
FROM recipe_versions
WHERE recipe_id = NEW.id;
IF new_version < 1 THEN new_version := 1.0;
END IF;
-- إغلاق الإصدار السابق
UPDATE recipe_versions
SET effective_until = NOW()
WHERE recipe_id = NEW.id
    AND effective_until IS NULL;
-- تحديد نوع التغيير والملخص
IF TG_OP = 'INSERT' THEN change_summary_text := 'تم إنشاء الوصفة';
change_details_json := jsonb_build_object('action', 'created');
ELSE -- مقارنة التغييرات
change_details_json := jsonb_build_object();
IF OLD.name IS DISTINCT
FROM NEW.name THEN change_details_json := change_details_json || jsonb_build_object(
        'name',
        jsonb_build_object('old', OLD.name, 'new', NEW.name)
    );
END IF;
IF OLD.ingredients::text IS DISTINCT
FROM NEW.ingredients::text THEN change_details_json := change_details_json || jsonb_build_object('ingredients', 'تم تحديث المكونات');
END IF;
IF OLD.mixing_steps::text IS DISTINCT
FROM NEW.mixing_steps::text THEN change_details_json := change_details_json || jsonb_build_object('mixing_steps', 'تم تحديث خطوات الخلط');
END IF;
change_summary_text := 'تم تحديث الوصفة';
END IF;
-- إنشاء الإصدار الجديد
INSERT INTO recipe_versions (
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
        NEW.id,
        new_version,
        NEW.name,
        NEW.name_en,
        NEW.ingredients,
        NEW.mixing_steps,
        NEW.notes,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'created'
            ELSE 'updated'
        END,
        change_summary_text,
        change_details_json,
        NOW(),
        auth.uid(),
        user_name
    )
RETURNING id INTO last_version_id;
-- تحديث الوصفة بمعرف الإصدار الحالي
NEW.current_version_id := last_version_id;
NEW.version_count := (
    SELECT COUNT(*)
    FROM recipe_versions
    WHERE recipe_id = NEW.id
);
NEW.last_versioned_at := NOW();
NEW.version := new_version;
-- تسجيل في سجل التغييرات
INSERT INTO recipe_change_log (
        recipe_id,
        version_id,
        action,
        changed_by,
        changed_by_name,
        reason
    )
VALUES (
        NEW.id,
        last_version_id,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'create'
            ELSE 'update'
        END,
        auth.uid(),
        user_name,
        change_summary_text
    );
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- 6. إنشاء الـ Trigger
-- =====================================================
DROP TRIGGER IF EXISTS trigger_recipe_versioning ON recipes;
CREATE TRIGGER trigger_recipe_versioning BEFORE
INSERT
    OR
UPDATE ON recipes FOR EACH ROW
    WHEN (pg_trigger_depth() = 0) -- تجنب التكرار اللانهائي
    EXECUTE FUNCTION create_recipe_version();
-- =====================================================
-- 7. سياسات RLS
-- =====================================================
ALTER TABLE recipe_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_change_log ENABLE ROW LEVEL SECURITY;
-- سياسة القراءة للجميع المصرح لهم
CREATE POLICY "recipe_versions_select" ON recipe_versions FOR
SELECT TO authenticated USING (true);
CREATE POLICY "recipe_change_log_select" ON recipe_change_log FOR
SELECT TO authenticated USING (true);
-- سياسة الإدراج للمستخدمين المصرح لهم
CREATE POLICY "recipe_versions_insert" ON recipe_versions FOR
INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "recipe_change_log_insert" ON recipe_change_log FOR
INSERT TO authenticated WITH CHECK (true);
-- =====================================================
-- 8. دالة استعادة إصدار سابق
-- =====================================================
CREATE OR REPLACE FUNCTION restore_recipe_version(
        p_recipe_id UUID,
        p_version_id UUID,
        p_reason TEXT DEFAULT 'استعادة إصدار سابق'
    ) RETURNS UUID AS $$
DECLARE v_version RECORD;
new_version_id UUID;
user_name TEXT;
BEGIN -- الحصول على بيانات الإصدار المطلوب استعادته
SELECT * INTO v_version
FROM recipe_versions
WHERE id = p_version_id;
IF NOT FOUND THEN RAISE EXCEPTION 'الإصدار غير موجود';
END IF;
-- الحصول على اسم المستخدم
SELECT COALESCE(raw_user_meta_data->>'full_name', email) INTO user_name
FROM auth.users
WHERE id = auth.uid();
-- تحديث الوصفة ببيانات الإصدار القديم
UPDATE recipes
SET name = v_version.name,
    name_en = v_version.name_en,
    ingredients = v_version.ingredients,
    mixing_steps = v_version.mixing_steps,
    notes = v_version.notes,
    updated_at = NOW()
WHERE id = p_recipe_id
RETURNING current_version_id INTO new_version_id;
-- تسجيل عملية الاستعادة
INSERT INTO recipe_change_log (
        recipe_id,
        version_id,
        action,
        changed_by,
        changed_by_name,
        reason,
        old_value,
        new_value
    )
VALUES (
        p_recipe_id,
        new_version_id,
        'restore',
        auth.uid(),
        user_name,
        p_reason,
        jsonb_build_object(
            'restored_from_version',
            v_version.version_number
        ),
        jsonb_build_object('new_version_id', new_version_id)
    );
RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- 9. عرض لسهولة الاستعلام
-- =====================================================
CREATE OR REPLACE VIEW recipe_versions_with_duration AS
SELECT rv.*,
    get_version_duration_days(rv.id) as duration_days,
    CASE
        WHEN rv.effective_until IS NULL THEN 'نشط'
        ELSE 'منتهي'
    END as status,
    r.name as current_recipe_name
FROM recipe_versions rv
    JOIN recipes r ON rv.recipe_id = r.id
ORDER BY rv.recipe_id,
    rv.version_number DESC;
-- منح الصلاحيات
GRANT SELECT ON recipe_versions_with_duration TO authenticated;
COMMENT ON TABLE recipe_versions IS 'سجل إصدارات الوصفات - يحتفظ بنسخة كاملة من كل إصدار';
COMMENT ON TABLE recipe_change_log IS 'سجل التغييرات التفصيلي للوصفات';
COMMENT ON FUNCTION restore_recipe_version IS 'استعادة إصدار سابق من الوصفة';