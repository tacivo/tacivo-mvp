-- Add missing columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_expert BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS area_of_expertise TEXT;

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT,
  years_of_experience INTEGER,
  area_of_expertise TEXT,
  goal TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_expert BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX idx_invitations_status ON invitations(status);

-- Enable RLS on invitations table
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view invitations for their organization
CREATE POLICY "Admins can view their organization invitations"
  ON invitations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Policy: Admins can create invitations for their organization
CREATE POLICY "Admins can create invitations"
  ON invitations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Policy: Admins can update invitations for their organization
CREATE POLICY "Admins can update invitations"
  ON invitations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Policy: Admins can delete invitations for their organization
CREATE POLICY "Admins can delete invitations"
  ON invitations
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Update trigger for invitations
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitations_updated_at();

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE invitations IS 'Stores user invitations to join organizations';
COMMENT ON COLUMN profiles.is_expert IS 'Indicates if the user is designated as a subject matter expert';
COMMENT ON COLUMN profiles.goal IS 'User''s goal or objective within the organization';
COMMENT ON COLUMN profiles.area_of_expertise IS 'User''s area of expertise or specialization';
