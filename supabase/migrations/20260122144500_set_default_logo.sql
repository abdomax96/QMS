-- Set a default logo for the main company so it appears on the login page
UPDATE "public"."companies"
SET "logo_url" = '/Logo.png'
WHERE "id" = 'a0000001-0000-0000-0000-000000000001'
    AND "logo_url" IS NULL;
