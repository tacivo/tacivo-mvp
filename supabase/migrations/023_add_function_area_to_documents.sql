-- Add function_area column to documents table
-- This allows us to display function_area for shared documents without needing
-- to join to the interviews table (which is RLS-protected)

ALTER TABLE documents ADD COLUMN IF NOT EXISTS function_area TEXT;

-- Create an index for filtering by function_area
CREATE INDEX IF NOT EXISTS idx_documents_function_area ON documents(function_area);

-- Backfill existing documents with function_area from their related interviews
UPDATE documents d
SET function_area = i.function_area
FROM interviews i
WHERE d.interview_id = i.id
AND d.function_area IS NULL
AND i.function_area IS NOT NULL;
