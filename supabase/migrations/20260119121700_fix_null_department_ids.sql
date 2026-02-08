-- Fix existing form_templates and form_instances with NULL department_id
-- This migration updates all records where department_id is NULL to set it to the user's department
-- Update form_templates: Set department_id based on created_by user
UPDATE form_templates ft
SET department_id = (
        SELECT u.department_id
        FROM users u
        WHERE u.id::text = ft.created_by
        LIMIT 1
    )
WHERE ft.department_id IS NULL
    AND ft.created_by IS NOT NULL;
-- Update form_instances: Set department_id based on created_by user  
UPDATE form_instances fi
SET department_id = (
        SELECT u.department_id
        FROM users u
        WHERE u.id::text = fi.created_by
        LIMIT 1
    )
WHERE fi.department_id IS NULL
    AND fi.created_by IS NOT NULL;
-- For records where created_by is NULL or doesn't match a user,
-- We can set a default department or leave as NULL (they'll be hidden by RLS)
-- Optionally, you can uncomment this to set a specific department:
-- UPDATE form_templates SET department_id = '59157dbf-7fe6-42c3-8630-04eaea72e875' WHERE department_id IS NULL;
-- UPDATE form_instances SET department_id = '59157dbf-7fe6-42c3-8630-04eaea72e875' WHERE department_id IS NULL;