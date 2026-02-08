-- Migration: Document Control System
-- Date: 2026-01-19
-- Description: Adds tables for document management with versioning and approval workflow
SET app.bypass_permission_check = 'on';
-- =============================================
-- 1. Documents Table (Main document registry)
-- =============================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    -- Document identification
    document_number TEXT NOT NULL,
    title TEXT NOT NULL,
    title_ar TEXT,
    description TEXT,
    -- Classification
    type TEXT NOT NULL CHECK (
        type IN (
            'sop',
            'work_instruction',
            'manual',
            'form',
            'policy',
            'specification',
            'other'
        )
    ),
    category TEXT,
    department_id UUID REFERENCES departments(id),
    -- Version tracking
    current_version INTEGER DEFAULT 1,
    -- Status workflow
    status TEXT DEFAULT 'draft' CHECK (
        status IN (
            'draft',
            'pending_review',
            'approved',
            'obsolete',
            'archived'
        )
    ),
    -- Ownership
    owner_id UUID REFERENCES auth.users(id),
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    obsolete_at TIMESTAMPTZ,
    -- Constraints
    UNIQUE(company_id, document_number)
);
-- =============================================
-- 2. Document Versions Table
-- =============================================
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    -- Version info
    version INTEGER NOT NULL,
    -- Content
    content TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    -- Change tracking
    changes_summary TEXT,
    change_reason TEXT,
    -- Approval workflow
    status TEXT DEFAULT 'draft' CHECK (
        status IN (
            'draft',
            'pending_review',
            'approved',
            'rejected'
        )
    ),
    -- People
    created_by UUID REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    -- Constraints
    UNIQUE(document_id, version)
);
-- =============================================
-- 3. Document Access Log (Audit trail)
-- =============================================
CREATE TABLE IF NOT EXISTS document_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_id UUID REFERENCES document_versions(id) ON DELETE
    SET NULL,
        user_id UUID NOT NULL REFERENCES auth.users(id),
        action TEXT NOT NULL CHECK (
            action IN (
                'view',
                'download',
                'print',
                'edit',
                'approve',
                'reject'
            )
        ),
        ip_address TEXT,
        user_agent TEXT,
        accessed_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 4. Enable RLS
-- =============================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;
-- Company isolation policies
CREATE POLICY "documents_company_isolation" ON documents FOR ALL TO authenticated USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "document_versions_company_isolation" ON document_versions FOR ALL TO authenticated USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "document_access_log_authenticated" ON document_access_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Service role bypass
CREATE POLICY "documents_service_bypass" ON documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "document_versions_service_bypass" ON document_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "document_access_log_service_bypass" ON document_access_log FOR ALL TO service_role USING (true) WITH CHECK (true);
-- =============================================
-- 5. Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_number ON documents(document_number);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_company_id ON document_versions(company_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_status ON document_versions(status);
CREATE INDEX IF NOT EXISTS idx_document_access_log_document ON document_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_user ON document_access_log(user_id);
-- =============================================
-- 6. Helper Function: Create New Version
-- =============================================
CREATE OR REPLACE FUNCTION create_document_version(
        p_document_id UUID,
        p_file_path TEXT DEFAULT NULL,
        p_file_name TEXT DEFAULT NULL,
        p_content TEXT DEFAULT NULL,
        p_changes_summary TEXT DEFAULT NULL,
        p_change_reason TEXT DEFAULT NULL
    ) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_version_id UUID;
v_new_version INTEGER;
v_company_id UUID;
BEGIN -- Get next version number
SELECT current_version + 1,
    company_id INTO v_new_version,
    v_company_id
FROM documents
WHERE id = p_document_id;
-- Create new version
INSERT INTO document_versions (
        document_id,
        company_id,
        version,
        content,
        file_path,
        file_name,
        changes_summary,
        change_reason,
        created_by,
        status
    )
VALUES (
        p_document_id,
        v_company_id,
        v_new_version,
        p_content,
        p_file_path,
        p_file_name,
        p_changes_summary,
        p_change_reason,
        auth.uid(),
        'draft'
    )
RETURNING id INTO v_version_id;
-- Update document current version
UPDATE documents
SET current_version = v_new_version,
    updated_at = NOW()
WHERE id = p_document_id;
RETURN v_version_id;
END;
$$;
GRANT EXECUTE ON FUNCTION create_document_version TO authenticated;
SET app.bypass_permission_check = 'off';
DO $$ BEGIN RAISE NOTICE 'تم إنشاء نظام التحكم بالوثائق بنجاح!';
END $$;