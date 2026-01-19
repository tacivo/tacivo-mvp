-- Drop document_ai_summaries table as we now use plain_text instead
-- This table was used to store AI-generated summaries for playbook generation
-- Now we extract plain text directly from BlockNote content, which is more efficient

DROP TABLE IF EXISTS document_ai_summaries CASCADE;
