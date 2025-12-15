-- Add 'blocknote' to the allowed document formats

-- Drop the existing check constraint
ALTER TABLE documents DROP CONSTRAINT documents_format_check;

-- Add the new check constraint with 'blocknote' included
ALTER TABLE documents ADD CONSTRAINT documents_format_check
  CHECK (format IN ('markdown', 'pdf', 'blocknote'));
