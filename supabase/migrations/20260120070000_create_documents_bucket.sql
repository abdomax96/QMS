-- Migration: Create documents storage bucket
-- Date: 2026-01-20
-- Description: Creates the 'documents' storage bucket for COA and other file uploads
-- Create the documents bucket if it doesn't exist
INSERT INTO storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
    )
VALUES (
        'documents',
        'documents',
        true,
        52428800,
        ARRAY ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    ) ON CONFLICT (id) DO NOTHING;
-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload documents" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
-- Allow anyone to read files (public bucket)
CREATE POLICY "Anyone can read documents" ON storage.objects FOR
SELECT TO public USING (bucket_id = 'documents');
-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update documents" ON storage.objects FOR
UPDATE TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');
DO $$ BEGIN RAISE NOTICE 'تم إنشاء مخزن الوثائق documents بنجاح!';
END $$;