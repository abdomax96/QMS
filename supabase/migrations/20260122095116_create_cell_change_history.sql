-- Migration: Create cell_change_history table for real-time collaboration
-- Purpose: Track all cell-level changes with user information and timestamps
-- Author: QMS Development Team
-- Date: 2026-01-22
-- ==================== CREATE TABLE ====================
CREATE TABLE IF NOT EXISTS cell_change_history (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Foreign Keys
    instance_id UUID NOT NULL REFERENCES form_instances(id) ON DELETE CASCADE,
    -- Cell Location (Composite Key)
    section_id TEXT NOT NULL,
    table_id TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    -- Change Data
    old_value JSONB,
    new_value JSONB,
    -- Audit Information
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_by_name TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
    -- Versioning for Conflict Detection
    version INTEGER NOT NULL DEFAULT 1,
    -- Metadata
    client_id TEXT,
    -- للتعرف على الجلسة
    notes TEXT,
    -- ملاحظات اختيارية
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ==================== INDEXES ====================
-- Index for fast lookups by instance
CREATE INDEX IF NOT EXISTS idx_cell_history_instance ON cell_change_history(instance_id);
-- Index for recent changes
CREATE INDEX IF NOT EXISTS idx_cell_history_time ON cell_change_history(changed_at DESC);
-- Index for user activity
CREATE INDEX IF NOT EXISTS idx_cell_history_user ON cell_change_history(changed_by);
-- Composite index for cell location queries
CREATE INDEX IF NOT EXISTS idx_cell_history_location ON cell_change_history(
    instance_id,
    section_id,
    table_id,
    row_index,
    col_index
);
-- Index for version queries (conflict detection)
CREATE INDEX IF NOT EXISTS idx_cell_history_version ON cell_change_history(
    instance_id,
    section_id,
    table_id,
    row_index,
    col_index,
    version
);
-- ==================== ROW LEVEL SECURITY ====================
-- Enable RLS
ALTER TABLE cell_change_history ENABLE ROW LEVEL SECURITY;
-- Policy: Users can view history of forms they have access to
CREATE POLICY "Users can view cell history of accessible forms" ON cell_change_history FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM form_instances fi
            WHERE fi.id = cell_change_history.instance_id
                AND (
                    -- مالك النموذج
                    fi.created_by = auth.uid()::text
                    OR -- نفس القسم
                    EXISTS (
                        SELECT 1
                        FROM users u
                        WHERE u.id = auth.uid()
                            AND u.department_id = fi.department_id
                    )
                )
        )
    );
-- Policy: Users can insert changes to forms they can edit
CREATE POLICY "Users can record changes to editable forms" ON cell_change_history FOR
INSERT WITH CHECK (
        -- المستخدم الحالي هو من يقوم بالتسجيل
        changed_by = auth.uid()
        AND -- النموذج في حالة قابلة للتحرير
        EXISTS (
            SELECT 1
            FROM form_instances fi
            WHERE fi.id = instance_id
                AND fi.status IN ('draft', 'in_progress')
                AND (
                    fi.created_by = auth.uid()::text
                    OR EXISTS (
                        SELECT 1
                        FROM users u
                        WHERE u.id = auth.uid()
                            AND u.department_id = fi.department_id
                    )
                )
        )
    );
-- Policy: No updates allowed (audit trail is immutable)
CREATE POLICY "Cell history is immutable" ON cell_change_history FOR
UPDATE USING (false);
-- Policy: No deletes allowed (audit trail is permanent)
CREATE POLICY "Cell history cannot be deleted" ON cell_change_history FOR DELETE USING (false);
-- ==================== TRIGGERS ====================
-- Trigger: Auto-increment version for same cell edits
CREATE OR REPLACE FUNCTION increment_cell_version() RETURNS TRIGGER AS $$ BEGIN -- Get the latest version for this cell
SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
FROM cell_change_history
WHERE instance_id = NEW.instance_id
    AND section_id = NEW.section_id
    AND table_id = NEW.table_id
    AND row_index = NEW.row_index
    AND col_index = NEW.col_index;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_increment_cell_version BEFORE
INSERT ON cell_change_history FOR EACH ROW EXECUTE FUNCTION increment_cell_version();
-- ==================== HELPER FUNCTIONS ====================
-- Function: Get cell change history with pagination
CREATE OR REPLACE FUNCTION get_cell_history(
        p_instance_id UUID,
        p_section_id TEXT,
        p_table_id TEXT,
        p_row_index INTEGER,
        p_col_index INTEGER,
        p_limit INTEGER DEFAULT 50,
        p_offset INTEGER DEFAULT 0
    ) RETURNS TABLE (
        id UUID,
        old_value JSONB,
        new_value JSONB,
        changed_by UUID,
        changed_by_name TEXT,
        changed_at TIMESTAMPTZ,
        change_type TEXT,
        version INTEGER
    ) AS $$ BEGIN RETURN QUERY
SELECT cch.id,
    cch.old_value,
    cch.new_value,
    cch.changed_by,
    cch.changed_by_name,
    cch.changed_at,
    cch.change_type,
    cch.version
FROM cell_change_history cch
WHERE cch.instance_id = p_instance_id
    AND cch.section_id = p_section_id
    AND cch.table_id = p_table_id
    AND cch.row_index = p_row_index
    AND cch.col_index = p_col_index
ORDER BY cch.changed_at DESC
LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function: Get recent changes for an instance
CREATE OR REPLACE FUNCTION get_recent_instance_changes(
        p_instance_id UUID,
        p_limit INTEGER DEFAULT 100
    ) RETURNS TABLE (
        id UUID,
        section_id TEXT,
        table_id TEXT,
        row_index INTEGER,
        col_index INTEGER,
        old_value JSONB,
        new_value JSONB,
        changed_by UUID,
        changed_by_name TEXT,
        changed_at TIMESTAMPTZ,
        change_type TEXT
    ) AS $$ BEGIN RETURN QUERY
SELECT cch.id,
    cch.section_id,
    cch.table_id,
    cch.row_index,
    cch.col_index,
    cch.old_value,
    cch.new_value,
    cch.changed_by,
    cch.changed_by_name,
    cch.changed_at,
    cch.change_type
FROM cell_change_history cch
WHERE cch.instance_id = p_instance_id
ORDER BY cch.changed_at DESC
LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ==================== COMMENTS ====================
COMMENT ON TABLE cell_change_history IS 'سجل شامل لجميع التعديلات على مستوى الخلية في النماذج - يدعم التعاون في الوقت الفعلي';
COMMENT ON COLUMN cell_change_history.instance_id IS 'معرف النموذج (form instance)';
COMMENT ON COLUMN cell_change_history.section_id IS 'معرف القسم في النموذج';
COMMENT ON COLUMN cell_change_history.table_id IS 'معرف الجدول في القسم';
COMMENT ON COLUMN cell_change_history.row_index IS 'رقم الصف (0-indexed)';
COMMENT ON COLUMN cell_change_history.col_index IS 'رقم العمود (0-indexed)';
COMMENT ON COLUMN cell_change_history.version IS 'رقم الإصدار - يزيد تلقائياً لاكتشاف التعارضات';
COMMENT ON FUNCTION increment_cell_version() IS 'Trigger function: يزيد رقم الإصدار تلقائياً عند إضافة تعديل جديد';
COMMENT ON FUNCTION get_cell_history IS 'دالة مساعدة: الحصول على سجل تعديلات خلية معينة';
COMMENT ON FUNCTION get_recent_instance_changes IS 'دالة مساعدة: الحصول على آخر التعديلات في النموذج';
