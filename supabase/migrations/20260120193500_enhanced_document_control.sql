-- Migration: Enhanced Document Control System
-- Date: 2026-01-20
-- Description: Adds signatures, templates, and categories for document management
SET app.bypass_permission_check = 'on';
-- =============================================
-- 1. Document Categories Table
-- =============================================
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT,
    code VARCHAR(20),
    parent_id UUID REFERENCES document_categories(id) ON DELETE
    SET NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, code)
);
-- =============================================
-- 2. Document Templates Table
-- =============================================
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT,
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
    content TEXT,
    -- HTML content template
    header_content TEXT,
    -- Header HTML
    footer_content TEXT,
    -- Footer HTML
    page_margins JSONB DEFAULT '{"top": 20, "bottom": 20, "left": 20, "right": 20}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 3. Document Signatures Table
-- =============================================
CREATE TABLE IF NOT EXISTS document_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    signer_id UUID NOT NULL REFERENCES auth.users(id),
    signature_type TEXT NOT NULL CHECK (
        signature_type IN (
            'author',
            'reviewer',
            'approver'
        )
    ),
    signature_data TEXT,
    -- Base64 signature image or digital signature
    comments TEXT,
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    UNIQUE(version_id, signer_id, signature_type)
);
-- =============================================
-- 4. Add category_id to documents if not exists
-- =============================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'documents'
        AND column_name = 'category_id'
) THEN
ALTER TABLE documents
ADD COLUMN category_id UUID REFERENCES document_categories(id);
END IF;
END $$;
-- =============================================
-- 5. Add template_id to documents if not exists
-- =============================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'documents'
        AND column_name = 'template_id'
) THEN
ALTER TABLE documents
ADD COLUMN template_id UUID REFERENCES document_templates(id);
END IF;
END $$;
-- =============================================
-- 6. Enable RLS
-- =============================================
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
-- Policies for document_categories
CREATE POLICY "document_categories_company_isolation" ON document_categories FOR ALL TO authenticated USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "document_categories_service_bypass" ON document_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Policies for document_templates
CREATE POLICY "document_templates_company_isolation" ON document_templates FOR ALL TO authenticated USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "document_templates_service_bypass" ON document_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Policies for document_signatures
CREATE POLICY "document_signatures_authenticated" ON document_signatures FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "document_signatures_service_bypass" ON document_signatures FOR ALL TO service_role USING (true) WITH CHECK (true);
-- =============================================
-- 7. Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_document_categories_company ON document_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_parent ON document_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_company ON document_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(type);
CREATE INDEX IF NOT EXISTS idx_document_signatures_document ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_version ON document_signatures(version_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signer ON document_signatures(signer_id);
-- =============================================
-- 8. Insert Default Templates
-- =============================================
INSERT INTO document_templates (
        company_id,
        name,
        name_ar,
        type,
        content,
        header_content,
        footer_content,
        is_default
    )
SELECT c.id,
    'SOP Template',
    'قالب إجراء تشغيل قياسي',
    'sop',
    '<h1>إجراء التشغيل القياسي</h1>
<h2>1. الغرض</h2>
<p>...</p>
<h2>2. النطاق</h2>
<p>...</p>
<h2>3. المسؤوليات</h2>
<p>...</p>
<h2>4. الإجراءات</h2>
<p>4.1 ...</p>
<p>4.2 ...</p>
<h2>5. السجلات</h2>
<p>...</p>',
    '<table style="width:100%; border-bottom: 2px solid #333;">
<tr>
<td style="width:30%;"><strong>رقم الوثيقة:</strong> {{document_number}}</td>
<td style="width:40%; text-align:center;"><strong>{{title}}</strong></td>
<td style="width:30%; text-align:left;"><strong>الإصدار:</strong> {{version}}</td>
</tr>
</table>',
    '<table style="width:100%; border-top: 1px solid #ccc; font-size: 10pt;">
<tr>
<td>تاريخ السريان: {{effective_date}}</td>
<td style="text-align:center;">صفحة {{page}} من {{total_pages}}</td>
<td style="text-align:left;">{{company_name}}</td>
</tr>
</table>',
    true
FROM companies c
WHERE NOT EXISTS (
        SELECT 1
        FROM document_templates t
        WHERE t.company_id = c.id
            AND t.type = 'sop'
            AND t.is_default = true
    );
INSERT INTO document_templates (
        company_id,
        name,
        name_ar,
        type,
        content,
        is_default
    )
SELECT c.id,
    'Work Instruction Template',
    'قالب تعليمات العمل',
    'work_instruction',
    '<h1>تعليمات العمل</h1>
<h2>1. الهدف</h2>
<p>...</p>
<h2>2. الأدوات والمعدات</h2>
<p>...</p>
<h2>3. خطوات العمل</h2>
<ol>
<li>الخطوة الأولى</li>
<li>الخطوة الثانية</li>
<li>الخطوة الثالثة</li>
</ol>
<h2>4. ملاحظات السلامة</h2>
<p>...</p>',
    true
FROM companies c
WHERE NOT EXISTS (
        SELECT 1
        FROM document_templates t
        WHERE t.company_id = c.id
            AND t.type = 'work_instruction'
            AND t.is_default = true
    );
SET app.bypass_permission_check = 'off';
DO $$ BEGIN RAISE NOTICE '✅ تم إضافة الجداول الإضافية لنظام التحكم بالوثائق!';
END $$;