-- Add plain_text column to documents table for storing unformatted text content
-- This will be used for playbook generation instead of AI summaries

ALTER TABLE documents ADD COLUMN IF NOT EXISTS plain_text TEXT;
