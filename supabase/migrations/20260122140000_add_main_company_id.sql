-- Add main_company_id to settings table
ALTER TABLE "public"."settings"
ADD COLUMN IF NOT EXISTS "main_company_id" UUID REFERENCES "public"."companies"("id");
-- Add comment
COMMENT ON COLUMN "public"."settings"."main_company_id" IS 'Reference to the main company/tenant for this installation';
