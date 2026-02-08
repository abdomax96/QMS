-- Enable RLS (good practice to ensure it is on, though likely already is)
ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;
-- Allow users to view their own preferences
CREATE POLICY "Users can view own notification preferences" ON "public"."notification_preferences" FOR
SELECT TO authenticated USING (auth.uid() = user_id);
-- Allow users to insert their own preferences
CREATE POLICY "Users can insert own notification preferences" ON "public"."notification_preferences" FOR
INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Allow users to update their own preferences
CREATE POLICY "Users can update own notification preferences" ON "public"."notification_preferences" FOR
UPDATE TO authenticated USING (auth.uid() = user_id);
-- Allow users to delete their own preferences
CREATE POLICY "Users can delete own notification preferences" ON "public"."notification_preferences" FOR DELETE TO authenticated USING (auth.uid() = user_id);