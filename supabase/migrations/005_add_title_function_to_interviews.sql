-- Add title and function_area columns to interviews table
ALTER TABLE interviews
ADD COLUMN title TEXT,
ADD COLUMN function_area TEXT;

-- Add helpful comments
COMMENT ON COLUMN interviews.title IS 'Title of the interview/document';
COMMENT ON COLUMN interviews.function_area IS 'Function or area of application for the knowledge being captured';
