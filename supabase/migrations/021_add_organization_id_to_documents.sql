-- Add organization_id column to documents table
-- This allows direct filtering of shared documents by organization

ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id uuid NULL;

-- Add foreign key constraint
ALTER TABLE documents
ADD CONSTRAINT documents_organization_id_fkey
FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents USING btree (organization_id);

-- Backfill existing documents with organization_id from their author's profile
UPDATE documents d
SET organization_id = p.organization_id
FROM profiles p
WHERE d.user_id = p.id AND d.organization_id IS NULL;
