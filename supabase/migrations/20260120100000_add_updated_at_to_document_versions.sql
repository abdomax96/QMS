ALTER TABLE document_versions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Create trigger to automatically update updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE TRIGGER handle_updated_at BEFORE
UPDATE ON document_versions FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);