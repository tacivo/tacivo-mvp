-- Fix RLS policy to use organization_id instead of company for shared documents
-- This ensures users in the same organization can see shared documents
-- regardless of minor differences in company name strings

-- Drop the old policy that uses company matching
DROP POLICY IF EXISTS "Users can view own or shared company documents" ON documents;

-- Create new policy that uses organization_id matching
CREATE POLICY "Users can view own or shared organization documents" ON documents
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (
      is_shared = TRUE
      AND organization_id IS NOT NULL
      AND organization_id = (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Update the comment to reflect the change
COMMENT ON COLUMN documents.is_shared IS 'When true, document is visible to all users in the same organization';
