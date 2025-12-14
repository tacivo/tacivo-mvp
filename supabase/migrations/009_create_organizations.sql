-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  industry TEXT,
  size TEXT, -- e.g., '1-10', '11-50', '51-200', '201-500', '500+'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add organization_id to profiles table
ALTER TABLE profiles
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);

-- Migrate existing company data to organizations
-- For each unique company name, create an organization and link profiles
DO $$
DECLARE
  company_record RECORD;
  new_org_id UUID;
BEGIN
  FOR company_record IN
    SELECT DISTINCT company
    FROM profiles
    WHERE company IS NOT NULL AND company != ''
  LOOP
    -- Create organization
    INSERT INTO organizations (name)
    VALUES (company_record.company)
    RETURNING id INTO new_org_id;

    -- Update all profiles with this company name
    UPDATE profiles
    SET organization_id = new_org_id
    WHERE company = company_record.company;
  END LOOP;
END $$;

-- Drop the old company column (keeping it for now as we may want to reference it)
-- We'll keep it temporarily and can drop in a future migration if needed
-- ALTER TABLE profiles DROP COLUMN company;

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own organization
CREATE POLICY "Users can view their organization"
  ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Admins can manage their organization
CREATE POLICY "Admins can update their organization"
  ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Policy: Admins can create organizations
CREATE POLICY "Admins can create organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Update the trigger to handle updated_at for organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- Add comment to document the migration
COMMENT ON TABLE organizations IS 'Stores organization/company information';
COMMENT ON COLUMN profiles.organization_id IS 'References the organization this profile belongs to';
