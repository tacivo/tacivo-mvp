-- Add is_super_admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.is_super_admin IS 'Super admin who can invite other admins';

-- Create admin_invitations table
CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS admin_invitations_token_idx ON admin_invitations(token);
CREATE INDEX IF NOT EXISTS admin_invitations_email_idx ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS admin_invitations_status_idx ON admin_invitations(status);

-- Enable RLS
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_invitations
-- Super admins can read all admin invitations
CREATE POLICY "Super admins can view admin invitations"
  ON admin_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Super admins can create admin invitations
CREATE POLICY "Super admins can create admin invitations"
  ON admin_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Super admins can update admin invitations
CREATE POLICY "Super admins can update admin invitations"
  ON admin_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Super admins can delete admin invitations
CREATE POLICY "Super admins can delete admin invitations"
  ON admin_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Add comments
COMMENT ON TABLE admin_invitations IS 'Invitations for new admin users sent by super admins';
COMMENT ON COLUMN admin_invitations.token IS 'Unique token used in invitation URL';
COMMENT ON COLUMN admin_invitations.status IS 'Current status of the invitation';
