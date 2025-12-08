-- ============================================================================
-- RESET RLS, POLICIES, AND FUNCTIONS
-- This script drops all existing policies, functions, and triggers
-- Then recreates them correctly from the initial schema
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================================================

-- Drop profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles from same company" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles from same organization" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile or admins can update org users" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Drop interviews policies
DROP POLICY IF EXISTS "Users can view their own interviews" ON interviews;
DROP POLICY IF EXISTS "Users can view organization interviews" ON interviews;
DROP POLICY IF EXISTS "Users can create their own interviews" ON interviews;
DROP POLICY IF EXISTS "Users can update their own interviews" ON interviews;
DROP POLICY IF EXISTS "Users can delete their own interviews" ON interviews;

-- Drop interview_messages policies
DROP POLICY IF EXISTS "Users can view messages from their interviews" ON interview_messages;
DROP POLICY IF EXISTS "Users can create messages in their interviews" ON interview_messages;

-- Drop documents policies
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can view organization documents" ON documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- Drop uploaded_files policies
DROP POLICY IF EXISTS "Users can view their own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can upload files to their interviews" ON uploaded_files;
DROP POLICY IF EXISTS "Users can delete their own uploaded files" ON uploaded_files;

-- ============================================================================
-- STEP 2: DROP ALL TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_interviews_updated_at ON interviews;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;

-- ============================================================================
-- STEP 3: DROP ALL FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- STEP 4: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: RECREATE FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    company,
    role,
    years_of_experience,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', ''),
    COALESCE((NEW.raw_user_meta_data->>'years_of_experience')::integer, 0),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: RECREATE TRIGGERS
-- ============================================================================

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: RECREATE RLS POLICIES - PROFILES
-- ============================================================================

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- STEP 8: RECREATE RLS POLICIES - INTERVIEWS
-- ============================================================================

CREATE POLICY "Users can view their own interviews"
  ON interviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interviews"
  ON interviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interviews"
  ON interviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interviews"
  ON interviews FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 9: RECREATE RLS POLICIES - INTERVIEW MESSAGES
-- ============================================================================

CREATE POLICY "Users can view messages from their interviews"
  ON interview_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_messages.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their interviews"
  ON interview_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews
      WHERE interviews.id = interview_messages.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 10: RECREATE RLS POLICIES - DOCUMENTS
-- ============================================================================

CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 11: RECREATE RLS POLICIES - UPLOADED FILES
-- ============================================================================

CREATE POLICY "Users can view their own uploaded files"
  ON uploaded_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files to their interviews"
  ON uploaded_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploaded files"
  ON uploaded_files FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check policies
SELECT 'POLICIES CREATED:' as info;
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check triggers
SELECT 'TRIGGERS CREATED:' as info;
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check functions
SELECT 'FUNCTIONS CREATED:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('handle_new_user', 'update_updated_at_column')
ORDER BY routine_name;

SELECT 'SUCCESS: All policies, triggers, and functions have been reset and recreated!' as result;
