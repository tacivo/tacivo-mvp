-- Fix profiles RLS to allow users to view profiles from same company
-- This is needed for the document sharing feature to work properly

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new policy that allows viewing own profile AND profiles from same company
CREATE POLICY "Users can view profiles from same company" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR
    company = (
      SELECT company FROM profiles WHERE id = auth.uid()
    )
  );

-- Add helpful comment
COMMENT ON POLICY "Users can view profiles from same company" ON profiles IS 'Allows users to view their own profile and profiles of users in the same company (needed for shared documents feature)';
