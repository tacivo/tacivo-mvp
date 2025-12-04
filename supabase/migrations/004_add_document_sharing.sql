-- Add is_shared column to documents table
ALTER TABLE documents
ADD COLUMN is_shared BOOLEAN DEFAULT FALSE;

-- Create index for faster querying of shared documents
CREATE INDEX idx_documents_shared ON documents(is_shared, created_at DESC);

-- Update RLS policies to allow reading shared documents from same company
-- First, drop existing select policy
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;

-- Create new select policy that allows viewing own documents OR shared documents from same company
CREATE POLICY "Users can view own or shared company documents" ON documents
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (
      is_shared = TRUE
      AND user_id IN (
        SELECT id FROM profiles
        WHERE company = (
          SELECT company FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

-- Add helpful comment
COMMENT ON COLUMN documents.is_shared IS 'When true, document is visible to all users in the same company';
